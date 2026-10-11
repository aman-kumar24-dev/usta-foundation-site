// Branch preview smoke test: one /site-config.json request, which Tags embed and environment the
// host resolves to, a page view, Hotjar once, no [site-config] warnings. Read-only; real hits are sent.
// Usage: node test-branch.mjs [url]   (default: branch preview /en/home)
import {
  BRANCH_URL, BEACON, LAUNCH, launchBrowser,
} from '../lib.mjs';

const url = process.argv[2] || `${BRANCH_URL}/en/home`;
const browser = await launchBrowser();
const page = await browser.newPage();
const reqs = [];
const warnings = [];
page.on('request', (r) => reqs.push(r.url()));
page.on('console', (m) => { if (m.text().includes('[site-config]')) warnings.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(6000);
const env = await page.evaluate(() => window.ustaSiteConfig?.getEnvironment() || null);
console.log(JSON.stringify({
  env,
  sheetRequests: reqs.filter((u) => /\/site-config\.json/.test(u)).length,
  tags: reqs.filter((u) => LAUNCH.test(u)).map((u) => u.split('/').pop()),
  pageViews: reqs.filter((u) => BEACON.test(u) && !/pccr=true/.test(u)).length,
  hotjar: reqs.filter((u) => /static\.hotjar\.com\/c\/hotjar-/.test(u)).length,
  warnings,
}, null, 1));
await browser.close();
