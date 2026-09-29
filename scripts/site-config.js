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

/**
 * Prod = customer domain, or EDS `main--*` on  aem.live.
 * @param {string} [hostname]
 * @returns {boolean}
 */
export function isProdEnvironment(hostname = window.location.hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return false;
  }
  if (host.endsWith('.aem.page')) {
    return false;
  }
  if (host.endsWith('.aem.live')) {
    return host.startsWith('main--');
  }
  return true;
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
 * @returns {string}
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

  config = next;
  rawConfig = json;

  window.ustaSiteConfig = Object.freeze({
    getConfig,
    getSiteConfig,
    whenSiteConfigReady,
    isProdEnvironment,
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
  (error) => rejectReady(error instanceof Error ? error : new Error(String(error))),
);
