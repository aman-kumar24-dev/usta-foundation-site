// What a URL actually runs: Target metadata, sheet target.* values, at.js / VisitorAPI / Tags,
// Target delivery calls (status, mid, sdid) and page-view sdid. Read-only; real hits are sent.
// Usage: node diagnose.mjs [url]   (default: branch preview home)
import {
  BRANCH_URL, BEACON, DELIVERY, LAUNCH, launchBrowser,
} from '../lib.mjs';

const url = process.argv[2] || `${BRANCH_URL}/`;
const browser = await launchBrowser();
const page = await browser.newPage();
const reqs = [];
const logs = [];
const deliveries = [];
const t0 = Date.now();
page.on('request', (r) => {
  reqs.push(r.url());
  if (DELIVERY.test(r.url())) {
    let body = {};
    try { body = JSON.parse(r.postData() || '{}'); } catch { /* not JSON */ }
    const u = new URL(r.url());
    deliveries.push({
      atMs: Date.now() - t0,
      host: u.host,
      client: u.searchParams.get('client'),
      version: u.searchParams.get('version'),
      mid: body.id?.marketingCloudVisitorId || null,
      sdid: body.experienceCloud?.analytics?.supplementalDataId || null,
    });
  }
});
page.on('response', async (res) => {
  if (!DELIVERY.test(res.url())) return;
  const d = deliveries.find((x) => x.host === new URL(res.url()).host && x.status === undefined);
  if (d) d.status = res.status();
});
page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 160)}`));
await page.goto(url);
await page.waitForTimeout(6000);
const state = await page.evaluate(async () => {
  const sheet = await fetch('/site-config.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return {
    metaTarget: [...document.head.querySelectorAll('meta')].filter((m) => /target/i.test(m.name || m.getAttribute('property') || '')).map((m) => `${m.name}=${m.content}`),
    sheetTarget: sheet?.settings?.data?.filter((r) => r.key.startsWith('target.')).map((r) => `${r.key}=${r.value}`),
    atVersion: window.adobe?.target?.VERSION ?? null,
    satellite: !!window._satellite,
    visitorInstances: (window.s_c_il || []).filter((x) => x && x._c === 'Visitor').map((v) => v.marketingCloudOrgID),
  };
});
const has = (re) => reqs.filter((u) => re.test(u)).map((u) => u.replace(/\?.*/, '').split('/').slice(-2).join('/'));
console.log(JSON.stringify({
  ...state,
  targetJs: has(/scripts\/target\.js/),
  vendor: has(/scripts\/vendor\//),
  launch: has(LAUNCH),
  deliveries,
  pageViewSdid: reqs.filter((u) => BEACON.test(u)).map((u) => new URL(u).searchParams.get('sdid')),
  logs: logs.filter((l) => /target|site-config/i.test(l)).slice(0, 10),
}, null, 1));
await browser.close();
