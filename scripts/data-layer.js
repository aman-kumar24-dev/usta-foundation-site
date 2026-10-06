/**
 * window.dataLayer — the Google Tag Manager convention (a plain array of flat
 * `{event, ...}` objects) — as this site's shared data layer.
 *
 * Chosen over Adobe's Client Data Layer (ACDL, `window.adobeDataLayer`) on
 * purpose: this site plans to add GTM and Meta-Pixel-style vendors, and
 * `dataLayer` is the convention GTM reads natively (its own gtm.js drains the
 * array's existing items on load, then takes over `push`). Using the same
 * global now means no parallel data layer to keep in sync later.
 *
 * A plain dataLayer has no listener API of its own (unlike ACDL) — this wraps
 * `push` ONCE, early, purely as an ADDITIVE side effect (it still calls the
 * original array push for every item, so nothing pushed is ever lost), so
 * first-party code here (analytics.js) can listen for a named event and get
 * both past (already-pushed) and future items without a load-order
 * dependency on the producer (donate.js).
 *
 * Note: once a real GTM container is added, gtm.js will install its own
 * `push` wrapper on top of this one — first-party listeners registered here
 * keep receiving every event pushed through `window.dataLayer.push` either
 * way, since GTM also calls through to the array's existing push chain.
 */

let wrapped = false;
const listeners = {};

function notify(item) {
  const type = item && item.event;
  if (type && listeners[type]) listeners[type].slice().forEach((fn) => fn(item));
}

/** Initialize window.dataLayer and wrap `push` for first-party listening. Idempotent. */
export function initDataLayer() {
  window.dataLayer = window.dataLayer || [];
  if (wrapped) return;
  wrapped = true;
  const originalPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = (...items) => {
    items.forEach(notify);
    return originalPush(...items);
  };
}

/**
 * Listen for a named dataLayer event: replays any matching item already
 * pushed, then calls `handler` for every future push of that event.
 * @param {string} type the event name (the pushed item's `event` field)
 * @param {(item: object) => void} handler
 */
export function onDataLayerEvent(type, handler) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.filter((item) => item && item.event === type).forEach(handler);
  listeners[type] = listeners[type] || [];
  listeners[type].push(handler);
}
