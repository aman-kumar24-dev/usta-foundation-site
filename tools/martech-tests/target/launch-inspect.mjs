// Inspect the Tags (Launch) library a page loads: rules (events → actions), Analytics settings,
// the page-view rule's Set Variables custom code, the Tags debug log and the call stack of each
// page-view beacon. Beacons answered locally.
// Usage: node launch-inspect.mjs <url>
import { LAUNCH, launchBrowser, answerBeacons } from '../lib.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
await page.addInitScript(() => {
  try { localStorage.setItem('com.adobe.reactor.debug', 'true'); } catch { /* storage blocked */ }
  // record who creates each /b/ss/ image request
  window.beaconStacks = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...desc,
    set(v) {
      if (/\/b\/ss\//.test(v)) window.beaconStacks.push(new Error().stack.split('\n').slice(2, 7).map((l) => l.trim().slice(0, 140)));
      desc.set.call(this, v);
    },
  });
});
const logs = [];
page.on('console', (m) => { if (/Rule|Firing|beacon|Adobe Analytics/i.test(m.text())) logs.push(m.text().slice(0, 130)); });
let beacons = 0;
await answerBeacons(page, () => { beacons += 1; });
await page.goto(process.argv[2]);
await page.waitForTimeout(8000);
const info = await page.evaluate((launchSrc) => {
  const container = window._satellite?._container || {};
  const pageView = (container.rules || []).find((r) => /page view/i.test(r.name));
  const setVars = pageView?.actions.find((a) => a.modulePath.endsWith('setVariables.js'));
  const aa = container.extensions?.['adobe-analytics']?.settings || {};
  return {
    tagsScriptTags: [...document.scripts].filter((s) => new RegExp(launchSrc).test(s.src)).length,
    property: window._satellite?.property?.name,
    rules: (container.rules || []).map((r) => ({
      name: r.name,
      events: r.events.map((e) => e.modulePath.split('/').pop()),
      actions: r.actions.map((a) => `${a.modulePath.split('/').pop()}${a.settings?.type ? `(${a.settings.type})` : ''}`),
    })),
    analytics: { accounts: aa.libraryCode?.accounts, trackerProperties: Object.keys(aa.trackerProperties || {}) },
    pageViewCustomCode: setVars?.settings?.customSetup?.source ? String(setVars.settings.customSetup.source).slice(0, 1500) : null,
    beaconStacks: window.beaconStacks,
  };
}, LAUNCH.source);
console.log(JSON.stringify({ beacons, ...info }, null, 1));
console.log('tags debug log:\n ', logs.join('\n  '));
await browser.close();
