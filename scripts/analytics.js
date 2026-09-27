/**
 * Adobe Analytics loader (Adobe Experience Platform Tags with the Analytics
 * extension). Loaded in the delayed phase from scripts.js.
 *
 * Resolves the current site + environment from the hostname (see
 * analytics-config.js), waits for consent when that site requires it, then
 * injects the site's Tags embed code once, asynchronously. Donation events from
 * donate.js are sent as Analytics link beacons (site's `donateBeacons`).
 */
import SITES from './analytics-config.js';
import { onConsent } from './consent-check.js';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const TRACKER_POLL_MS = 500;
const TRACKER_POLL_MAX = 40;

/**
 * Find the site entry and environment for a hostname.
 * @param {string} hostname
 * @returns {{site: object, env: 'development'|'production'}|null}
 */
function resolveSite(hostname) {
  if (LOCAL_HOSTS.includes(hostname)) {
    const site = SITES.find((s) => s.local);
    return site ? { site, env: 'development' } : null;
  }
  // repoless EDS hosts: {ref}--{site}--{org}.aem.page|live
  const eds = hostname.match(/^([^.]+)\.aem\.(page|live)$/);
  if (eds) {
    const siteKey = eds[1].split('--').slice(-2).join('--');
    const site = SITES.find((s) => s.edsSites.includes(siteKey));
    return site ? { site, env: eds[2] === 'page' ? 'development' : 'production' } : null;
  }
  const site = SITES.find((s) => s.productionHosts.includes(hostname));
  return site ? { site, env: 'production' } : null;
}

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

const match = resolveSite(window.location.hostname);
const src = match?.site.launch?.[match.env];
if (src) {
  const { donateBeacons } = match.site;
  if (donateBeacons) {
    // events emitted before this module loaded, then live ones
    (window.donateEvents || []).forEach((detail) => handleDonateEvent(donateBeacons, detail));
    window.addEventListener('donate', (e) => handleDonateEvent(donateBeacons, e.detail));
  }
  if (match.site.consentRequired) onConsent(() => loadTags(src));
  else loadTags(src);
}
