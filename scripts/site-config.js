/**
 * Site configuration from `/site-config.json`.
 * Eager fetch (non-blocking) + `whenSiteConfigReady()` for delayed consumers.
 *
 * Env-specific keys use `.production` / `.development` suffixes
 * (e.g. `launch.production`, `hotjarId.development`).
 * Shared keys have no suffix (e.g. `consentRequired`, `hotjarVersion`).
 * Non-prod: prefer `.development`, fall back to `.production`, then bare key.
 */

const SITE_CONFIG_URL = '/site-config.json';

/** @type {Record<string, string>} */
let settings = Object.create(null);

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

/**
 * Prod = customer domain, or EDS `main--*` on aem.page / aem.live.
 * @param {string} [hostname]
 * @returns {boolean}
 */
export function isProdEnvironment(hostname = window.location.hostname) {
  const host = String(hostname || '').toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.startsWith('dev.') || host.includes('.dev.')) return false;
  if (host.startsWith('dev--')) return false;

  if (host.includes('.aem.page') || host.includes('.aem.live')) {
    return host.startsWith('main--');
  }

  return true;
}

/**
 * @param {string} baseKey Key without `.production` / `.development`
 * @returns {string}
 */
export function resolveSettingKey(baseKey) {
  if (!baseKey || typeof baseKey !== 'string') {
    throw new TypeError('resolveSettingKey: baseKey must be a non-empty string');
  }
  return isProdEnvironment() ? `${baseKey}.production` : `${baseKey}.development`;
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function hasSetting(key) {
  return Object.prototype.hasOwnProperty.call(settings, key)
    && String(settings[key]).trim() !== '';
}

/**
 * Env-aware lookup for spreadsheet keys.
 * @param {string} baseKey e.g. `launch`, `hotjarId`, `consentRequired`
 * @returns {string}
 */
export function getSetting(baseKey) {
  if (!baseKey || typeof baseKey !== 'string') {
    throw new TypeError('getSetting: baseKey must be a non-empty string');
  }

  const productionKey = `${baseKey}.production`;
  const developmentKey = `${baseKey}.development`;

  if (isProdEnvironment()) {
    if (hasSetting(productionKey)) return settings[productionKey];
    if (hasSetting(baseKey)) return settings[baseKey];
    return '';
  }

  if (hasSetting(developmentKey)) return settings[developmentKey];
  if (hasSetting(productionKey)) return settings[productionKey];
  if (hasSetting(baseKey)) return settings[baseKey];
  return '';
}

/**
 * Exact spreadsheet key (no env suffix logic).
 * @param {string} key
 * @returns {string}
 */
export function getExactSetting(key) {
  if (!key || typeof key !== 'string') {
    throw new TypeError('getExactSetting: key must be a non-empty string');
  }
  return hasSetting(key) ? settings[key] : '';
}

/**
 * @returns {Readonly<Record<string, string>>}
 */
export function getSettings() {
  return Object.freeze({ ...settings });
}

/**
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

  settings = next;
  rawConfig = json;

  window.ustaSiteConfig = Object.freeze({
    getSetting,
    getExactSetting,
    getSettings,
    getSiteConfig,
    whenSiteConfigReady,
    isProdEnvironment,
    resolveSettingKey,
  });
}

async function fetchSiteConfig() {
  const response = await fetch(SITE_CONFIG_URL);
  if (!response.ok) {
    throw new Error(`site-config.json: HTTP ${response.status} for ${SITE_CONFIG_URL}`);
  }
  applyConfig(await response.json());
}

fetchSiteConfig().then(
  () => resolveReady(),
  (error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    // eslint-disable-next-line no-console -- config failure must be visible
    console.error('[site-config]', err);
    rejectReady(err);
  },
);
