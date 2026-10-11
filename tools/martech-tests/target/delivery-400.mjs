// Capture the Target delivery request + response for a URL (why is delivery 400?).
// Beacons answered locally. Note: Target answers 400 for http://localhost page addresses.
// Usage: node delivery-400.mjs <url>
import { DELIVERY, launchBrowser, answerBeacons } from '../lib.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
await answerBeacons(page);
const out = [];
page.on('response', async (res) => {
  if (!DELIVERY.test(res.url())) return;
  const req = JSON.parse(res.request().postData() || '{}');
  let body = '';
  try { body = (await res.text()).slice(0, 600); } catch { /* no body */ }
  out.push({
    status: res.status(),
    url: res.url().replace(/sessionId=[^&]+/, 'sessionId=…'),
    context: { address: req.context?.address, channel: req.context?.channel },
    id: req.id,
    experienceCloud: req.experienceCloud,
    execute: req.execute,
    property: req.property,
    response: body,
  });
});
await page.goto(process.argv[2]);
await page.waitForTimeout(6000);
console.log(JSON.stringify(out, null, 1));
await browser.close();
