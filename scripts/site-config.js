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
