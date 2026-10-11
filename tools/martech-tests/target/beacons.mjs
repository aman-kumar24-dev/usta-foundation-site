// List the Analytics beacons a page sends (report suite, type, link name, context data) and the
// Tags property / rules / extensions it runs. Read-only; real hits are sent.
// Usage: node beacons.mjs <url>
import { BEACON, launchBrowser } from '../lib.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
const hits = [];
const t0 = Date.now();
page.on('request', (r) => {
  const u = r.url();
  if (!BEACON.test(u)) return;
  const q = new URL(u).searchParams;
  hits.push({
    atMs: Date.now() - t0,
    rsid: new URL(u).pathname.split('/')[3],
    method: r.method(),
    pe: q.get('pe') || 'page view',
    pev2: q.get('pev2'),
    pageName: q.get('pageName'),
    pccr: q.get('pccr'),
    contextData: (decodeURIComponent(u).match(/c\.&(.*?)&\.c/) || [])[1]?.slice(0, 80) || null,
  });
});
await page.goto(process.argv[2]);
await page.waitForTimeout(9000);
const launch = await page.evaluate(() => ({
  property: window._satellite?.property?.name,
  env: window._satellite?.environment?.stage,
  rules: (window._satellite?._container?.rules || []).map((r) => r.name),
  extensions: Object.keys(window._satellite?._container?.extensions || {}),
}));
console.log(JSON.stringify({ launch, hits }, null, 1));
await browser.close();
