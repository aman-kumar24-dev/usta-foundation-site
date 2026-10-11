// A4T modes with simulated Target responses. Needs the dev server and proxy.mjs.
// Analytics beacons are answered locally; Target calls from the Tags library itself are blocked.
// Expect (per case title): payload captured, at most ONE fallback hit, server/off unchanged.
import {
  BASE, PROXY, DELIVERY, FIRST_PAINT_PROBE, launchBrowser, answerBeacons,
} from '../lib.mjs';

const TNTA = 'TNTA_TEST_123456';
const OFFER = 'OFFER HEADLINE FROM TARGET';
const sheet = await (await fetch(`${BASE}/site-config.json`)).json();
const CLIENT = sheet.settings.data.find((r) => r.key === 'target.clientCode')?.value;
const browser = await launchBrowser();

const delivery = (body, withPayload) => ({
  status: 200,
  requestId: body.requestId,
  client: CLIENT,
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
      ...(withPayload ? { analytics: { payload: { pe: 'tnt', tnta: TNTA } } } : {}),
    },
  },
});

async function run(name, query, { withPayload = true, simulateTagsRule = false, lateCapture = false } = {}) {
  const page = await browser.newPage();
  await page.addInitScript(FIRST_PAINT_PROBE);
  if (simulateTagsRule) {
    // what the Tags page-view rule should do: mark the payload as sent
    await page.addInitScript(() => {
      window.addEventListener('target-a4t', () => { window.targetA4TPayloadSent = true; });
    });
  }
  const deliveries = [];
  const beacons = [];
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.route(DELIVERY, async (route) => {
    const url = route.request().url();
    if (new URL(url).searchParams.get('client') !== CLIENT) { await route.abort(); return; }
    const body = JSON.parse(route.request().postData() || '{}');
    deliveries.push({
      logging: body.experienceCloud?.analytics?.logging,
      mid: body.id?.marketingCloudVisitorId || null,
      sdid: body.experienceCloud?.analytics?.supplementalDataId || null,
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(delivery(body, withPayload)) });
  });
  await answerBeacons(page, (u) => beacons.push(u));
  await page.goto(`${PROXY}/en/home?tgt=1&${query}`);
  await page.waitForTimeout(7000);
  if (lateCapture) {
    // payload arriving after the page view already went out
    await page.evaluate(async (tnta) => {
      const src = '/scripts/target-a4t.js'; // runs in the page: site-relative
      const { captureA4T } = await import(src);
      captureA4T({ execute: { pageLoad: { analytics: { payload: { pe: 'tnt', tnta } } } } });
    }, TNTA);
    await page.waitForTimeout(2500);
  }
  const state = await page.evaluate(() => ({
    payload: window.targetA4TPayload || null,
    sent: !!window.targetA4TPayloadSent,
    firstPaint: window.firstPaintProbe,
  }));
  const parsed = beacons.map((u) => {
    const q = new URL(u).searchParams;
    return {
      pe: q.get('pe') || 'page', pev2: q.get('pev2'), hasPayload: u.includes(TNTA), sdid: q.get('sdid'),
    };
  });
  console.log(`\n== ${name}`);
  console.log(JSON.stringify({
    ...state,
    visitorApi: reqs.some((u) => /VisitorAPI\.min\.js/.test(u)),
    targetA4tJs: reqs.some((u) => /scripts\/target-a4t\.js/.test(u)),
    deliveries,
    beacons: parsed,
  }));
  await page.close();
}

await run('1. client mode → payload on the page view (Tags rule present) OR one "Target A4T" fallback hit (rule missing), never both', 'a4t=client&keepLaunch=1');
await run('2. client mode, targetA4TPayloadSent set by the rule → no fallback hit', 'a4t=client&keepLaunch=1', { simulateTagsRule: true });
await run('3. client mode, no payload (no activity qualified) → nothing extra', 'a4t=client&keepLaunch=1', { withPayload: false });
await run('4. client mode, payload captured AFTER the page view → one fallback hit', 'a4t=client&keepLaunch=1', { withPayload: false, lateCapture: true });
await run('5. server mode (a4t=true) → VisitorAPI + mid/sdid', 'a4t=true');
await run('6. off (a4t=0) → no VisitorAPI, no target-a4t.js', 'a4t=0');
await browser.close();
