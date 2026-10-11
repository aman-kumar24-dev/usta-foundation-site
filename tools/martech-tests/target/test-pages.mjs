// Functional checks after martech changes: Fundraise Up loads only after interaction, DONATE opens
// in the same tab (other links follow openLinksInNewTab), and page types render without errors.
// Beacons answered locally.
import { BASE, launchBrowser, answerBeacons } from '../lib.mjs';

const browser = await launchBrowser();
const ctx = await browser.newContext();
await answerBeacons(ctx);
const fundraiseUpLoaded = (p) => p.evaluate(() => performance.getEntriesByType('resource').some((r) => /cdn\.fundraiseup\.com\/widget/.test(r.name)));

// 1) Fundraise Up + links on the homepage
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
await page.goto(`${BASE}/en/home`);
await page.waitForTimeout(5000);
const fruIdle = await fundraiseUpLoaded(page);
await page.mouse.wheel(0, 200);
await page.waitForTimeout(1500);
const fruAfterScroll = await fundraiseUpLoaded(page);
const navLink = await page.evaluate(() => {
  const a = document.querySelector('footer a[href^="/"], footer a[href^="http"]');
  if (!a) return null;
  a.addEventListener('click', (e) => e.preventDefault(), { once: true });
  a.click();
  return { href: a.getAttribute('href'), target: a.target || null };
});
const popupPromise = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null);
await page.getByRole('link', { name: 'DONATE NOW' }).click();
const popup = await popupPromise;
await page.waitForTimeout(1500);
console.log(JSON.stringify({
  fundraiseUp: { idle5s: fruIdle, afterScroll: fruAfterScroll },
  footerLinkOnClick: navLink,
  donateClick: { sameTab: !popup, url: page.url().replace(BASE, '') },
  errors,
}, null, 1));
await page.close();

// 2) page types render (first section + header + footer), no page errors
const paths = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/content/en/home/who-we-are',
  '/content/en/home/get-involved',
  '/content/en/home/news/frances-tiafoe-presents-check-to-jtcc',
];
for (const path of paths) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  const res = await p.goto(`${BASE}${path}`);
  await p.waitForTimeout(4000);
  const s = await p.evaluate(() => ({
    h1: document.querySelector('main h1')?.textContent.trim().slice(0, 50),
    sectionsLoaded: document.querySelectorAll('main .section[data-section-status="loaded"]').length,
    header: !!document.querySelector('header .nav-wrapper'),
    footer: !!document.querySelector('footer [class^="footer-"]'),
  }));
  console.log(path, res.status(), JSON.stringify({ ...s, errors: errs }));
  await p.close();
}
await browser.close();
