// How AppMeasurement serializes A4T variables (why the Tags rule uses contextData['a4t.payload']):
//   1) s.tl() with tnt/tnta overrides  2) s.t() with s.tnt/s.tnta  3) s.t() with contextData.
// Also prints when Tags started (delayed-phase timer). Beacons answered locally.
// Usage: node appmeasurement-vars.mjs [url]
import {
  BASE, LAUNCH, launchBrowser, answerBeacons,
} from '../lib.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
const beacons = [];
await answerBeacons(page, (u) => beacons.push(u));
await page.goto(process.argv[2] || `${BASE}/en/home`);
await page.waitForFunction(() => (window.s_c_il || []).some((t) => t && t.account && t.tl), null, { timeout: 20000 });
await page.waitForTimeout(1500);
const timing = await page.evaluate((launchSrc) => {
  const nav = performance.getEntriesByType('navigation')[0];
  const launch = performance.getEntriesByType('resource').find((r) => new RegExp(launchSrc).test(r.name));
  return { loadEventEnd: Math.round(nav.loadEventEnd), launchStart: Math.round(launch?.startTime || -1) };
}, LAUNCH.source);
const before = beacons.length;
await page.evaluate(() => {
  const s = window.s_c_il.find((t) => t && t.account && t.tl);
  s.tl(true, 'o', 'A4T test link', {
    tnt: 'TNT_VIA_TNT', tnta: 'TNT_VIA_TNTA', pe: 'tnt', linkTrackVars: 'tnt,tnta,pe',
  });
  s.tnt = 'TNT_ON_PAGEVIEW';
  s.tnta = 'TNTA_ON_PAGEVIEW';
  s.t();
  s.contextData = s.contextData || {};
  s.contextData['a4t.payload'] = 'CTX_PAGEVIEW_TNTA';
  s.t();
});
await page.waitForTimeout(1500);
console.log('timing (ms):', JSON.stringify(timing));
beacons.slice(before).forEach((u, i) => {
  const q = new URL(u).searchParams;
  const vars = [...q.entries()].filter(([k, v]) => /tnt/i.test(k) || /TNT/.test(v) || k === 'pe' || k === 'pev2');
  const ctx = decodeURIComponent(u).match(/c\.&[^]*?&\.c/)?.[0]?.slice(0, 120) || null;
  console.log(`beacon ${i + 1}:`, JSON.stringify({ ...Object.fromEntries(vars), contextData: ctx }));
});
await browser.close();
