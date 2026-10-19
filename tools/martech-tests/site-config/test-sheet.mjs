// Serves edited /site-config.json variants to the local site and shows that behaviour follows the
// sheet (no code defaults). Baseline = the sheet the dev server serves now. Beacons answered locally.
// Usage: node test-sheet.mjs [url]
import {
  BASE, DELIVERY, LAUNCH, launchBrowser, answerBeacons, injectTargetMeta,
} from '../lib.mjs';

const PAGE = process.argv[2] || `${BASE}/en/home`;
const base = await (await fetch(`${BASE}/site-config.json`, { cache: 'no-store' })).json();
const setKey = (json, key, value) => {
  const j = structuredClone(json);
  j.settings.data.forEach((r) => { if (r.key === key) r.value = value; });
  return j;
};
const withoutKeys = (json, re) => {
  const j = structuredClone(json);
  j.settings.data = j.settings.data.filter((r) => !re.test(r.key));
  return j;
};
const editDonate = (json) => {
  const j = structuredClone(json);
  const row = j['donate-beacons']?.data.find((r) => r.event === 'donationComplete');
  if (row) row.linkName = 'Edited In DA';
  return j;
};
const cases = [
  ['sheet as published', base],
  ['all launch.* rows removed → no Tags', withoutKeys(base, /^launch/)],
  ['invalid values (consentRequired=yes, launch.development=evil) → ignored with a warning', setKey(setKey(base, 'consentRequired', 'yes'), 'launch.development', 'https://evil.example/x.js')],
  ['consentRequired=true → Tags wait for consent; site at.js skipped', setKey(base, 'consentRequired', 'true')],
  ['donate linkName edited → beacon uses the new name', editDonate(base)],
  ['sheet missing (404) → nothing loads, no errors', null],
  ['target.enabled=false (+ Target metadata) → no at.js', setKey(base, 'target.enabled', 'false')],
];

const browser = await launchBrowser();
for (const [name, json] of cases) {
  const page = await browser.newPage();
  await page.route('**/site-config.json', (route) => (json
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) })
    : route.fulfill({ status: 404, body: '' })));
  if (name.startsWith('target')) await injectTargetMeta(page, PAGE);
  const reqs = [];
  const warnings = [];
  const beacons = [];
  await answerBeacons(page, (u) => beacons.push(u));
  page.on('request', (r) => reqs.push(r.url()));
  page.on('console', (m) => { if (m.text().includes('[site-config]')) warnings.push(m.text().slice(0, 140)); });
  await page.goto(PAGE);
  await page.waitForTimeout(5500);
  let donateBeacon = null;
  if (name.startsWith('donate')) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('donate', { detail: { type: 'donationComplete', amount: 5 } })));
    await page.waitForTimeout(2000);
    donateBeacon = beacons.map((u) => new URL(u).searchParams.get('pev2')).filter(Boolean);
  }
  console.log(`\n== ${name}`);
  console.log(JSON.stringify({
    tags: reqs.filter((u) => LAUNCH.test(u)).map((u) => u.split('/').pop()),
    evilLoaded: reqs.some((u) => /evil\.example/.test(u)),
    pageView: beacons.some((u) => !new URL(u).searchParams.get('pe')),
    donateBeacon,
    atjs: reqs.some((u) => /vendor\/at\.min\.js/.test(u)),
    targetDelivery: reqs.filter((u) => DELIVERY.test(u)).length,
    warnings,
  }));
  await page.close();
}
await browser.close();
