// site-config.js end to end on one URL (default: local home): one sheet request, Tags embed,
// Hotjar, at.js, environment rules per host, and the "sheet missing" case. Beacons answered locally.
// Usage: node test-merged.mjs [url]
import {
  BASE, BEACON, LAUNCH, launchBrowser, answerBeacons,
} from '../lib.mjs';

const PAGE = process.argv[2] || `${BASE}/en/home`;
const browser = await launchBrowser();

async function run(name, { sheet404 = false } = {}) {
  const page = await browser.newPage();
  const reqs = [];
  const logs = [];
  page.on('request', (r) => reqs.push(r.url()));
  page.on('console', (m) => { if (['warning', 'error'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 120)}`); });
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 120)}`));
  await answerBeacons(page);
  if (sheet404) await page.route('**/site-config.json', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto(PAGE);
  await page.waitForTimeout(8000);
  const state = await page.evaluate(() => {
    const api = window.ustaSiteConfig;
    const hosts = ['localhost', 'aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page', 'main--usta-foundation-site--aman-kumar24-dev.aem.live',
      'aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.live', 'main--x--y.hlx.live', 'www.ustafoundation.com', 'staging.example.org'];
    return {
      api: api ? Object.keys(api) : null,
      envRules: api ? Object.fromEntries(hosts.map((h) => [h, api.getEnvironment(h)])) : null,
      launchKey: api ? api.getConfig('launch') : null,
      hotjar: !!window._hjSettings,
      targetMeta: document.querySelector('meta[name="target" i]')?.content || null,
    };
  });
  const count = (re) => reqs.filter((u) => re.test(u)).length;
  console.log(`\n== ${name}`);
  console.log(JSON.stringify({
    sheetRequests: count(/\/site-config\.json/),
    tags: reqs.filter((u) => LAUNCH.test(u)).map((u) => u.split('/').slice(-2).join('/')),
    pageViews: count(BEACON),
    hotjarScript: count(/static\.hotjar\.com/),
    atjs: count(/vendor\/at\.min\.js/),
    ...state,
    logs: logs.filter((l) => !/hotjar only works over https/i.test(l)).slice(0, 8),
  }, null, 1));
  await page.close();
}

await run('A. real sheet');
await run('B. sheet missing (404) → no Tags, no Hotjar, no Target, no errors', { sheet404: true });
await browser.close();
