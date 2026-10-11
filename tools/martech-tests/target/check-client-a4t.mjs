// Live check of client-side A4T on a Target page: VisitorAPI absent, delivery logging=client_side,
// payload received, page view / fallback hits. Read-only; real hits are sent.
// Usage: node check-client-a4t.mjs [url]   (default: branch preview home)
import {
  BRANCH_URL, BEACON, DELIVERY, launchBrowser,
} from '../lib.mjs';

const url = process.argv[2] || `${BRANCH_URL}/`;
const browser = await launchBrowser();
const page = await browser.newPage();
const reqs = [];
const deliveries = [];
const hits = [];
page.on('request', (r) => {
  const u = r.url();
  reqs.push(u);
  if (DELIVERY.test(u)) {
    let b = {};
    try { b = JSON.parse(r.postData() || '{}'); } catch { /* not JSON */ }
    deliveries.push({
      client: new URL(u).searchParams.get('client'),
      logging: b.experienceCloud?.analytics?.logging,
      sdid: b.experienceCloud?.analytics?.supplementalDataId || null,
    });
  }
  if (BEACON.test(u) && !/pccr=true/.test(u)) {
    const q = new URL(u).searchParams;
    hits.push({ type: q.get('pe') || 'page view', name: q.get('pev2'), a4tContextData: /a4t\.&payload=/.test(decodeURIComponent(u)) });
  }
});
page.on('response', async (res) => {
  if (!DELIVERY.test(res.url())) return;
  try {
    const d = deliveries.find((x) => x.status === undefined);
    if (!d) return;
    d.status = res.status();
    const j = await res.json();
    d.options = j.execute?.pageLoad?.options?.length || 0;
    d.payload = !!j.execute?.pageLoad?.analytics?.payload?.tnta;
  } catch { /* non-JSON error body */ }
});
await page.goto(url);
await page.waitForTimeout(10000);
const state = await page.evaluate(() => ({
  targetA4TPayload: window.targetA4TPayload ? `${window.targetA4TPayload.slice(0, 24)}…` : null,
  sent: !!window.targetA4TPayloadSent,
}));
console.log(JSON.stringify({
  visitorApi: reqs.some((u) => /VisitorAPI\.min\.js/.test(u)),
  targetA4tJs: reqs.some((u) => /scripts\/target-a4t\.js/.test(u)),
  deliveries,
  ...state,
  hits,
}, null, 1));
await browser.close();
