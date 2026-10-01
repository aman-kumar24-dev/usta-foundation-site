/**
 * Analytics for Target (A4T) — client-side logging, without VisitorAPI.
 *
 * Used when the site's `target.a4t` is `client` (see site-config.js): at.js runs
 * with `analyticsLogging: 'client_side'`, so its page-load response carries the
 * Analytics payload (`execute.pageLoad.analytics.payload.tnta`). This module:
 *
 * 1. captureA4T(response) — exposes the payload as `window.targetA4TPayload` and
 *    a `target-a4t` window event, early (eager phase, before first paint).
 * 2. The Tags (Launch) page view, ~3s later, picks it up — in the Tags property's
 *    rule that sets global variables before the page view:
 *      if (window.targetA4TPayload) {
 *        s.contextData = s.contextData || {};
 *        s.contextData['a4t.payload'] = window.targetA4TPayload;
 *        window.targetA4TPayloadSent = true;
 *      }
 *    An Analytics processing rule maps the `a4t.payload` context data variable.
 *    (AppMeasurement 2.27 drops a raw `tnta` variable, so context data is used.)
 * 3. Fallback — if the first page view goes out WITHOUT the payload (Target
 *    answered after it, or the Tags rule isn't there), one link hit carries the
 *    same context data variable. Never sent twice.
 */

export const CONTEXT_KEY = 'a4t.payload';
const TRACKER_POLL_MS = 500;
const TRACKER_POLL_MAX = 40;

/** The AppMeasurement tracker created by the Tags Analytics extension, if ready. */
function getTracker() {
  return (window.s_c_il || []).find((t) => t && t.account && typeof t.tl === 'function');
}

function waitForTracker() {
  return new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      const tracker = getTracker();
      if (tracker || tries >= TRACKER_POLL_MAX) { resolve(tracker); return; }
      tries += 1;
      setTimeout(check, TRACKER_POLL_MS);
    };
    check();
  });
}

/** Analytics page views are /b/ss/ requests without a `pe=` (link/event) parameter. */
const isPageView = (url) => /\/b\/ss\//.test(url) && !/[?&]pe=/.test(url);

/** Did that page view already carry the payload (Tags rule ran)? */
function pageViewHadPayload(url, tnta) {
  if (window.targetA4TPayloadSent) return true;
  // long hits may be POSTed (body not visible) — then only the flag tells
  return url.includes(encodeURIComponent(tnta)) || url.includes(tnta);
}

async function sendFallback(tnta) {
  if (window.targetA4TPayloadSent) return;
  const tracker = await waitForTracker();
  if (!tracker || window.targetA4TPayloadSent) return;
  window.targetA4TPayloadSent = true;
  // overrides apply to this call only — nothing leaks into later hits
  tracker.tl(true, 'o', 'Target A4T', {
    contextData: { [CONTEXT_KEY]: tnta },
    linkTrackVars: `contextData.${CONTEXT_KEY}`,
  });
}

/** Watch for the first Analytics page view (past or future) and back-fill if needed. */
function watchFirstPageView(tnta) {
  if (typeof PerformanceObserver === 'undefined') return;
  let handled = false;
  const observer = new PerformanceObserver((list) => {
    if (handled) return;
    const pv = list.getEntries().find((e) => isPageView(e.name));
    if (!pv) return;
    handled = true;
    observer.disconnect();
    if (!pageViewHadPayload(pv.name, tnta)) sendFallback(tnta);
  });
  // buffered: also sees a page view that went out before the payload arrived
  observer.observe({ type: 'resource', buffered: true });
}

/**
 * Expose the A4T payload from an at.js getOffers() page-load response.
 * @param {object} response at.js getOffers() response
 * @returns {string|null} the tnta payload, or null when no activity qualified
 */
export function captureA4T(response) {
  const payload = response?.execute?.pageLoad?.analytics?.payload;
  if (!payload?.tnta) return null;
  window.targetA4TPayload = payload.tnta;
  window.dispatchEvent(new CustomEvent('target-a4t', { detail: payload }));
  watchFirstPageView(payload.tnta);
  return payload.tnta;
}
