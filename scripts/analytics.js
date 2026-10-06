/**
 * Adobe Analytics loader (Adobe Experience Platform Tags with the Analytics
 * extension). Loaded in the delayed phase from scripts.js.
 *
 * Reads the site's config (authored /site-config sheet over code defaults, see
 * site-config.js), waits for consent when that site requires it, then
 * injects the site's Tags embed code once, asynchronously. Donation events
 * from donate.js arrive via `window.dataLayer` (see data-layer.js) and are
 * sent as Analytics link beacons (site's `donateBeacons`). `onDataLayerEvent`
 * replays events already pushed, so this module has no load-order dependency
 * on donate.js.
 */
import { getSiteConfig } from './site-config.js';
import { onConsent } from './consent-check.js';
import { onDataLayerEvent } from './data-layer.js';

const TRACKER_POLL_MS = 500;
const TRACKER_POLL_MAX = 40;

// Tags state: `requested` once the embed is injected; `handlesDonate` when the
// library itself attached Fundraise Up listeners (see loadTags).
const tags = { requested: false, loaded: false, handlesDonate: false };
const pendingBeacons = [];

/** The AppMeasurement tracker created by the Analytics extension, if ready. */
function getTracker() {
  return (window.s_c_il || []).find((t) => t && t.account && typeof t.tl === 'function');
}

/** Send queued link beacons once the tracker exists (polls briefly after load). */
function flushBeacons(attempt = 0) {
  if (!tags.requested || !pendingBeacons.length) return;
  const tracker = getTracker();
  if (!tracker) {
    if (attempt < TRACKER_POLL_MAX) setTimeout(() => flushBeacons(attempt + 1), TRACKER_POLL_MS);
    return;
  }
  while (pendingBeacons.length) {
    const { linkName, vars } = pendingBeacons.shift();
    // Variable overrides apply to this call only, so nothing leaks into later beacons.
    tracker.tl(true, 'o', linkName, vars);
  }
}

/**
 * Build the link beacon for a donate.js event from the site's `donateBeacons`.
 * @returns {{linkName: string, vars: object}|null}
 */
function buildDonateBeacon(config, detail) {
  const rule = config[detail?.type];
  if (!rule) return null;
  const vars = { ...rule.set };
  const mapped = [];
  let hasValue = false;
  Object.entries(rule.map || {}).forEach(([field, names]) => {
    const value = detail[field];
    mapped.push(...names);
    if (value === null || value === undefined || value === '') return;
    hasValue = true;
    names.forEach((name) => { vars[name] = String(value); });
  });
  if (!hasValue) return null;
  vars.events = rule.events;
  vars.linkTrackEvents = rule.events;
  vars.linkTrackVars = ['events', ...Object.keys(rule.set || {}), ...mapped].join(',');
  return { linkName: rule.linkName, vars };
}

function handleDonateEvent(config, detail) {
  // Interim: the old Tags library has its own Fundraise Up rules. They attach
  // only if the widget stub existed when the library ran — then it sends these
  // beacons itself. Remove once the library no longer has those rules.
  if (tags.loaded && tags.handlesDonate) return;
  const beacon = buildDonateBeacon(config, detail);
  if (!beacon) return;
  pendingBeacons.push(beacon);
  flushBeacons();
}

/**
 * Inject the Tags embed code once.
 * @param {string} src Tags library URL
 */
function loadTags(src) {
  // eslint-disable-next-line no-underscore-dangle
  if (tags.requested || window._satellite || document.querySelector(`script[src="${src}"]`)) return;
  tags.requested = true;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  // `load` fires right after the library has run, so this reflects whether its
  // Fundraise Up rules found the widget stub.
  script.addEventListener('load', () => {
    tags.loaded = true;
    tags.handlesDonate = !!window.FundraiseUp;
    flushBeacons();
  });
  document.head.append(script);
}

getSiteConfig().then(({ site, env }) => {
  const src = site.launch?.[env];
  if (!src) return;
  const { donateBeacons } = site;
  if (donateBeacons) {
    // onDataLayerEvent replays items already pushed (e.g. by donate.js before
    // this ran) as well as future ones.
    Object.keys(donateBeacons).forEach((type) => {
      onDataLayerEvent(type, (item) => handleDonateEvent(donateBeacons, item));
    });
  }
  if (site.consentRequired) onConsent(() => loadTags(src));
  else loadTags(src);
});
