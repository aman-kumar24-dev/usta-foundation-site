// Eager site-config + flicker-free Target (simulated offers). Needs the dev server and proxy.mjs.
// Expect: one /site-config.json request per page; B shows the offer in the FIRST painted frame;
// A uses the page as authored (Target delivery answers 400 on localhost, so it paints at once);
// C paints the original h1 at the flickerTimeout cap and the offer lands later; D loads no at.js.
import {
  BASE, PROXY, DELIVERY, BEACON, FIRST_PAINT_PROBE, launchBrowser, answerBeacons, injectTargetMeta,
  overrideSheet, wait,
} from '../lib.mjs';

const OFFER = 'OFFER HEADLINE FROM TARGET';
const browser = await launchBrowser();

const fakeDelivery = (body) => ({
  status: 200,
  requestId: body.requestId,
  client: 'test',
  id: { tntId: 'test.35_0' },
  edgeHost: 'mboxedge35.tt.omtrdc.net',
  execute: {
    pageLoad: {
      options: [{
        type: 'actions',
        content: [{
          type: 'setHtml', selector: 'main .hero h1', cssSelector: 'main .hero h1', content: OFFER,
        }],
      }],
    },
  },
});

async function run(name, url, { deliveryDelay = 0, fake = false, targetOff = false } = {}) {
  const page = await browser.newPage();
  await page.addInitScript(FIRST_PAINT_PROBE);
  await answerBeacons(page);
  if (targetOff) {
    await injectTargetMeta(page, url);
    await overrideSheet(page, { 'target.enabled': 'false' });
  }
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  if (fake) {
    await page.route(DELIVERY, async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (deliveryDelay) await wait(deliveryDelay);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeDelivery(body)) });
    });
  }
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForTimeout(deliveryDelay ? deliveryDelay + 2500 : 5000);
  const state = await page.evaluate(() => ({
    firstPaint: window.firstPaintProbe,
    h1Now: document.querySelector('main h1')?.textContent.trim().slice(0, 60),
    lcpImgStart: Math.round((performance.getEntriesByType('resource').find((r) => /media_.*\.(jpg|jpeg|png|webp)/.test(r.name)) || {}).startTime || -1),
    configStart: Math.round((performance.getEntriesByType('resource').find((r) => r.name.endsWith('/site-config.json')) || {}).startTime || -1),
  }));
  const count = (re) => reqs.filter((u) => re.test(u)).length;
  console.log(`\n== ${name}`);
  console.log(JSON.stringify({
    ...state,
    siteConfigRequests: count(/\/site-config\.json$/),
    atjs: count(/vendor\/at\.min\.js/),
    delivery: count(DELIVERY),
    pageView: count(BEACON),
    ms: Date.now() - t0,
  }));
  await page.close();
}

await run('A. page as authored, real sheet', `${BASE}/en/home`);
await run('B. Target page, simulated offer on hero h1', `${PROXY}/en/home?tgt=1`, { fake: true });
await run('C. Target page, delivery delayed 2s (after the flickerTimeout cap, inside the at.js 3s timeout)', `${PROXY}/en/home?tgt=1`, { fake: true, deliveryDelay: 2000 });
await run('D. Target metadata but sheet target.enabled=false', `${BASE}/en/home`, { targetOff: true });
await browser.close();
