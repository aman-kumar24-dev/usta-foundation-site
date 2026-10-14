/**
 * Site configuration from the authored `/configs/site-config` sheet (DA). Each
 * environment is its own DA site with its own sheet, so values are used as-is:
 * there is no environment logic.
 *
 * The sheet has one tab per page-load phase — `eager`, `lazy`, `delayed` — each
 * with `key | value` rows. A tab is fetched on its own
 * (`/configs/site-config.json?sheet=<tab>`), once, when its phase first needs it,
 * so each request stays small. Put a setting in the tab of the phase that uses it.
 *
 * A missing tab or setting means the feature it configures is off. The one
 * exception is `consentRequired` (eager tab, so Target can decide before the
 * first section renders): anything other than `true` / `false` counts as required.
 */

const CONFIG_URL = '/configs/site-config.json';

/** @type {Map<string, Promise<Record<string, string>>>} */
const sheets = new Map();

function warn(message) {
  // eslint-disable-next-line no-console
  console.warn(`[site-config] ${message}`);
}

/**
 * `key | value` rows → { key: value } (trimmed; rows without a key skipped).
 * @param {object} json single-sheet JSON
 * @param {string} name tab name, for warnings
 * @returns {Record<string, string>}
 */
function toSettings(json, name) {
  const rows = Array.isArray(json?.data) ? json.data : [];
  const settings = Object.create(null);
  let keyless = 0;
  rows.forEach((row) => {
    const key = typeof row?.key === 'string' ? row.key.trim() : '';
    const value = row?.value == null ? '' : String(row.value).trim();
    if (key) settings[key] = value;
    else if (value) keyless += 1;
  });
  if (keyless) warn(`tab "${name}": ${keyless} row(s) without a key — skipped`);
  return settings;
}

/**
 * Settings of one tab as a plain object. Fetched once per page; resolves to {}
 * (with one warning) when the tab is unavailable.
 * @param {string} name tab name: `eager`, `lazy` or `delayed`
 * @param {RequestPriority} [priority] fetch priority if this call starts the request
 * @returns {Promise<Record<string, string>>}
 */
export function getSheet(name, priority) {
  if (!sheets.has(name)) {
    const url = `${CONFIG_URL}?sheet=${encodeURIComponent(name)}`;
    sheets.set(name, fetch(url, priority ? { priority } : {})
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => toSettings(json, name))
      .catch((error) => {
        warn(`tab "${name}" unavailable — its settings are not applied (${error.message})`);
        return Object.create(null);
      }));
  }
  return sheets.get(name);
}

let consentRequired;

/**
 * Whether the visitor must consent before martech loads — the one setting for
 * every vendor (`consentRequired`, eager tab). Anything other than `true` /
 * `false` (or no row) is reported once and counts as required.
 * @returns {Promise<boolean>}
 */
export function isConsentRequired() {
  consentRequired ??= getSheet('eager').then((settings) => {
    const value = (settings.consentRequired || '').toLowerCase();
    if (value !== 'true' && value !== 'false') {
      warn('invalid value for "consentRequired" — consent treated as required');
    }
    return value !== 'false';
  });
  return consentRequired;
}

/*
 * Transitional, removed by Martech 2/4: develop's hotjar-router.js reads its
 * settings (hotjarId, hotjarHostUrl, hotjarVersion — delayed tab) with
 * getConfig() after whenSiteConfigReady().
 */
let legacySettings = Object.create(null);

/** @returns {Promise<void>} rejects when the delayed tab is unavailable */
export function whenSiteConfigReady() {
  return getSheet('delayed').then((settings) => {
    if (!Object.keys(settings).length) throw new Error('delayed tab unavailable');
    legacySettings = settings;
  });
}

/**
 * @param {string} key delayed-tab key
 * @returns {string} '' when not set
 */
export function getConfig(key) {
  return legacySettings[key] || '';
}

fetchSiteConfig().then(
  () => resolveReady(),
  (error) => rejectReady(error instanceof Error ? error : new Error(String(error))),
);

/**
 * Loads comma-separated full HTTPS script URLs from site-config.
 *
 * Keys (env-aware via getConfig):
 *   script.eager    — load in the eager phase
 *   script.postlcp  — load after LCP (lazy phase)
 *   script.delay    — load in the delayed phase
 *
 * Each entry: `url` or `url|attr` or `url|attr=value|…` (authoring order preserved).
 * Everything after `|` is applied as a script attribute as authored — nothing else is added.
 *
 * Examples:
 *   https://a.example/hotjar.js?sv=6,https://maps.googleapis.com/maps/api/js?key=…&libraries=places&callback=emptyCallback
 *   https://a.example/a.js|async,https://a.example/b.js|defer,https://a.example/c.js|type=module|async
 *
 * @param {'eager'|'postlcp'|'delay'} phase
 */
export async function loadConfiguredScripts(phase) {
  if (phase !== 'eager' && phase !== 'postlcp' && phase !== 'delay') return;

  try {
    await whenSiteConfigReady();
  } catch {
    return;
  }

  getConfig(`script.${phase}`).split(',').forEach((entry) => {
    const parts = entry.split('|').map((part) => part.trim()).filter(Boolean);
    const trimmed = parts[0] || '';
    if (!trimmed || !URL.canParse(trimmed)) return;

    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return;
    if ([...document.scripts].some((script) => script.src === url.href)) return;

    const callback = url.searchParams.get('callback');
    if (callback && typeof window[callback] !== 'function') {
      window[callback] = () => {};
    }

    const script = document.createElement('script');
    script.src = url.href;

    // Apply each `|attr` / `|attr=value` from config onto the script tag.
    parts.slice(1).forEach((token) => {
      const eq = token.indexOf('=');
      const name = (eq === -1 ? token : token.slice(0, eq)).trim().toLowerCase();
      if (!name || name === 'src' || name.startsWith('on')) return;
      if (eq === -1) script.toggleAttribute(name, true);
      else script.setAttribute(name, token.slice(eq + 1).trim());
    });

    document.head.appendChild(script);
  });
}
window.hlx ??= {};
window.hlx.siteConfig = Object.freeze({ getSheet, isConsentRequired });
