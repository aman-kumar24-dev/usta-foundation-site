
/**
 * Loads analytics integrations from the shared site configuration.
 *
 * Expected configuration:
 *   launch
 *   hotjarId
 *   hotjarHostUrl
 *   hotjarVersion
 *
 * Hotjar source URL:
 *   `${hotjarHostUrl}${hotjarId}.js?sv=${hotjarVersion}`
 *
 * Configuration is loaded by site-config.js during the early phase.
 * This module waits for the shared configuration Promise and does not
 * initiate another request for site-config.json.
 */

import { whenSiteConfigReady, getSetting } from './site-config.js';

const DEFAULT_HOTJAR_VERSION = 6;

/**
 * Adds an external HTTPS script to the page if it has not already
 * been loaded.
 *
 * @param {string} src Full HTTPS script URL
 */
function injectScript(src) {
  const trimmed = String(src || '').trim();

  if (!trimmed || !URL.canParse(trimmed)) return;

  const url = new URL(trimmed);

  if (url.protocol !== 'https:') return;

  if ([...document.scripts].some((script) => script.src === url.href)) return;

  const script = document.createElement('script');
  script.src = url.href;
  script.async = true;

  document.head.appendChild(script);
}

/**
 * Initializes the Hotjar queue and loads the Hotjar script.
 *
 * @param {number} hjid Hotjar site ID
 * @param {number} hjsv Hotjar script version
 * @param {string} src Hotjar script URL
 */
function injectHotjar(hjid, hjsv, src) {
  /* eslint-disable no-underscore-dangle -- Hotjar public API */
  if (window.hj && window._hjSettings) return;

  window.hj = window.hj || function hj() {
    // Hotjar queues calls until the library has finished loading.
    // eslint-disable-next-line prefer-rest-params
    (window.hj.q = window.hj.q || []).push(arguments);
  };

  window._hjSettings = {
    hjid,
    hjsv,
  };

  injectScript(src);
}

/**
 * Reads and validates the Hotjar configuration.
 *
 * @returns {{ hjid: number, hjsv: number, src: string } | null}
 */
function readHotjarConfig() {
  const rawId = getSetting('hotjarId').trim();
  const hostUrl = getSetting('hotjarHostUrl').trim();

  if (!rawId || !hostUrl) return null;

  const hjid = Number(rawId);

  if (!Number.isFinite(hjid) || hjid <= 0) return null;

  const rawVersion = getSetting('hotjarVersion').trim();
  const hjsv = rawVersion
    ? Number(rawVersion)
    : DEFAULT_HOTJAR_VERSION;

  if (!Number.isFinite(hjsv) || hjsv <= 0) return null;

  const src = `${hostUrl}${hjid}.js?sv=${hjsv}`;

  if (!URL.canParse(src) || !src.startsWith('https:')) return null;

  return {
    hjid,
    hjsv,
    src,
  };
}

/**
 * Loads configured analytics integrations after the shared site
 * configuration becomes available.
 */
async function loadAnalyticsFromSiteConfig() {
  await whenSiteConfigReady();

  injectScript(getSetting('launch'));

  const hotjar = readHotjarConfig();

  if (hotjar) {
    injectHotjar(hotjar.hjid, hotjar.hjsv, hotjar.src);
  }
}

loadAnalyticsFromSiteConfig();

