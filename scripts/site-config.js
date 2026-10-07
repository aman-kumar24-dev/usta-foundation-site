/**
 * Site configuration from the authored `/site-config` sheet (DA → `/site-config.json`).
 * The single source of site settings — there are no code defaults: a setting that
 * isn't in the sheet (or isn't valid) is simply not used.
 *
 * One request per page: scripts.js starts `fetch('/site-config.json')` at the top
 * of the eager phase (`window.hlx.siteConfigFetch`, fetch priority high on Target
 * pages) and this module reuses it. `whenSiteConfigReady()` resolves once loaded
 * and rejects if the sheet is unavailable.
 *
 * Environment (isProdEnvironment / getEnvironment):
 *   localhost, 127.0.0.1, *.localhost        → development
 *   *.aem.page, *.hlx.page                   → development
 *   main--<site>--<org>.aem.live / .hlx.live → production
 *   <branch>--<site>--<org>.aem.live / .hlx.live (not main) → development
 *   any other host (customer domains, …)     → production
 *
 * Key lookup (getConfig): env-specific keys use `.production` / `.development`
 * suffixes (e.g. `launch.production`, `hotjarId.development`); shared keys have
 * none (e.g. `consentRequired`, `hotjarVersion`).
 *   production:  key.production → key
 *   development: key.development → key.production → key
 * Any key may be used (e.g. the Hotjar keys read by hotjar-router.js).
 *
 * getMartechConfig() turns the martech keys into validated settings for
 * analytics.js and target.js (Tags URL, consent, Target, A4T, donate beacons).
 */

const SITE_CONFIG_URL = '/site-config.json';

/** @type {Record<string, string>} */
let config = Object.create(null);

/** @type {object|null} */
let rawConfig = null;

/** @type {(value?: void) => void} */
let resolveReady;
/** @type {(reason: Error) => void} */
let rejectReady;

const ready = new Promise((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});
// consumers handle the rejection themselves; avoid an "uncaught in promise" report
ready.catch(() => {});

/**
 * Production = customer domain, or `main--*` on aem.live / hlx.live.
 * @param {string} [hostname]
 * @returns {boolean}
 */
export function isProdEnvironment(hostname = window.location.hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return false;
  }
  if (host.endsWith('.aem.page') || host.endsWith('.hlx.page')) {
    return false;
  }
  if (host.endsWith('.aem.live') || host.endsWith('.hlx.live')) {
    return host.startsWith('main--');
  }
  return true;
}

/**
 * @param {string} [hostname]
 * @returns {'production'|'development'}
 */
export function getEnvironment(hostname) {
  return isProdEnvironment(hostname) ? 'production' : 'development';
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function hasConfig(key) {
  return Object.prototype.hasOwnProperty.call(config, key)
    && String(config[key]).trim() !== '';
}

/**
 * Env-aware lookup for spreadsheet keys.
 * @param {string} baseKey e.g. `launch`, `hotjarId`, `consentRequired`
 * @returns {string} '' when not set
 */
export function getConfig(baseKey) {
  if (!baseKey || typeof baseKey !== 'string') {
    throw new TypeError('getConfig: baseKey must be a non-empty string');
  }

  const productionKey = `${baseKey}.production`;
  const developmentKey = `${baseKey}.development`;

  if (isProdEnvironment()) {
    if (hasConfig(productionKey)) return config[productionKey];
    if (hasConfig(baseKey)) return config[baseKey];
    return '';
  }

  if (hasConfig(developmentKey)) return config[developmentKey];
  if (hasConfig(productionKey)) return config[productionKey];
  if (hasConfig(baseKey)) return config[baseKey];
  return '';
}

/**
 * The raw sheet JSON (all tabs), or null before it has loaded.
 * @returns {object|null}
 */
export function getSiteConfig() {
  return rawConfig;
}

/**
 * @returns {Promise<void>}
 */
export function whenSiteConfigReady() {
  return ready;
}

/* ---------- martech settings (validated) ---------- */

function warn(message) {
  // eslint-disable-next-line no-console
  console.warn(`[site-config] ${message}`);
}

const toBool = (v) => ({ true: true, false: false })[String(v).trim().toLowerCase()];
const TAGS_URL = /^https:\/\/assets\.adobedtm\.com\/[\w./-]+\.js$/;

// base key → parser returning undefined when the value is invalid
const MARTECH_KEYS = {
  launch: (v) => (TAGS_URL.test(v) ? v : undefined),
  consentRequired: toBool,
  'target.enabled': toBool,
  'target.clientCode': (v) => (/^[\w-]+$/.test(v) ? v : undefined),
  'target.serverDomain': (v) => (/^[\w-]+\.tt\.omtrdc\.net$/.test(v) ? v : undefined),
  'target.imsOrgId': (v) => (/^[A-F0-9]+@AdobeOrg$/i.test(v) ? v : undefined),
  // false | true / server (VisitorAPI, server-side logging) | client (target-a4t.js)
  'target.a4t': (v) => {
    const s = String(v).trim().toLowerCase();
    if (s === 'client') return 'client';
    if (s === 'server') return true;
    return toBool(s);
  },
  'target.flickerTimeout': (v) => (/^\d+$/.test(v) && Number(v) <= 3000 ? Number(v) : undefined),
};

/** Validated value of a martech key, or undefined when unset/invalid. */
function martechValue(key) {
  const raw = getConfig(key).trim();
  if (!raw) return undefined;
  const parsed = MARTECH_KEYS[key](raw);
  if (parsed === undefined) warn(`invalid value for "${key}" — ignored`);
  return parsed;
}

/** "a=b; c=d" → { a: 'b', c: 'd' } */
function parsePairs(text) {
  return String(text || '').split(';').map((p) => p.trim()).filter(Boolean)
    .reduce((acc, pair) => {
      const [k, ...rest] = pair.split('=');
      if (k && rest.length) acc[k.trim()] = rest.join('=').trim();
      return acc;
    }, {});
}

const VARIABLE = /^(eVar\d+|prop\d+|pageName|channel|campaign)$/;

/** donate-beacons tab rows → donateBeacons object (invalid rows skipped). */
function parseDonateBeacons(rows) {
  return rows.reduce((beacons, row) => {
    const event = String(row.event || '').trim();
    const events = String(row.events || '').replace(/\s/g, '');
    const set = parsePairs(row.set);
    const map = Object.fromEntries(Object.entries(parsePairs(row.map))
      .map(([field, vars]) => [field, vars.split(',').map((v) => v.trim()).filter(Boolean)]));
    const varsOk = Object.keys(set).every((k) => VARIABLE.test(k))
      && Object.values(map).every((vars) => vars.length && vars.every((v) => VARIABLE.test(v)));
    if (!/^\w+$/.test(event) || !/^event\d+(,event\d+)*$/.test(events) || !varsOk || !Object.keys(map).length) {
      warn(`donate-beacons: ignoring invalid row "${event}"`);
      return beacons;
    }
    beacons[event] = {
      linkName: String(row.linkName || event).trim(), events, set, map,
    };
    return beacons;
  }, {});
}

let martechPromise;

/**
 * Validated martech settings for the current environment, from the sheet only.
 * Resolves to an empty site (nothing loads) when the sheet is unavailable.
 * @returns {Promise<{site: object, env: 'development'|'production'}>}
 */
export function getMartechConfig() {
  martechPromise ??= (async () => {
    const env = getEnvironment();
    try {
      await ready;
    } catch (e) {
      warn('sheet unavailable — Analytics and Target are not loaded');
      return { site: {}, env };
    }
    const launch = martechValue('launch');
    const site = {
      launch: launch ? { [env]: launch } : {},
      consentRequired: martechValue('consentRequired') ?? false,
      target: {
        enabled: martechValue('target.enabled') ?? false,
        clientCode: martechValue('target.clientCode'),
        serverDomain: martechValue('target.serverDomain'),
        imsOrgId: martechValue('target.imsOrgId'),
        a4t: martechValue('target.a4t') ?? false,
        flickerTimeout: martechValue('target.flickerTimeout') ?? 1000,
      },
    };
    const beaconRows = rawConfig?.['donate-beacons']?.data;
    if (beaconRows?.length) site.donateBeacons = parseDonateBeacons(beaconRows);
    // Target needs all three account settings
    const { clientCode, serverDomain, imsOrgId } = site.target;
    if (site.target.enabled && !(clientCode && serverDomain && imsOrgId)) {
      warn('target.enabled is true but clientCode / serverDomain / imsOrgId is missing — Target not loaded');
      site.target.enabled = false;
    }
    return { site, env };
  })();
  return martechPromise;
}

/* ---------- loading ---------- */

/**
 * @param {object} json
 */
function applyConfig(json) {
  const rows = json?.settings?.data;

  if (!Array.isArray(rows)) {
    throw new Error('site-config.json: missing settings.data array');
  }

  const next = Object.create(null);

  rows.forEach((row) => {
    if (!row || typeof row.key !== 'string' || !row.key.trim()) {
      throw new Error('site-config.json: settings row missing key');
    }

    next[row.key.trim()] = row.value == null ? '' : String(row.value);
  });

  config = next;
  rawConfig = json;

  window.ustaSiteConfig = Object.freeze({
    getConfig,
    getSiteConfig,
    getMartechConfig,
    whenSiteConfigReady,
    isProdEnvironment,
    getEnvironment,
  });
}

async function fetchSiteConfig() {
  // reuse the request scripts.js started at the beginning of the eager phase
  const response = await (window.hlx?.siteConfigFetch || fetch(SITE_CONFIG_URL));

  if (!response) {
    throw new Error(`site-config.json: network error for ${SITE_CONFIG_URL}`);
  }
  if (!response.ok) {
    throw new Error(`site-config.json: HTTP ${response.status} for ${SITE_CONFIG_URL}`);
  }

  applyConfig(await response.json());
}

fetchSiteConfig().then(
  () => resolveReady(),
  (error) => rejectReady(error instanceof Error ? error : new Error(String(error))),
);
