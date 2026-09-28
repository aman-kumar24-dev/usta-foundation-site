/**
 * Delayed-phase analytics from site-config keys:
 *   launch.production | launch.development
 *   hotjarId.production | hotjarId.development
 *   hotjarHostUrl.production | hotjarHostUrl.development
 *   hotjarVersion
 *
 * Host URL is the full prefix (e.g. https://static.hotjar.com/c/hotjar-);
 * final src = `${hotjarHostUrl}${hotjarId}.js?sv=${hotjarVersion}`.
 */

import { whenSiteConfigReady, getSetting } from './site-config.js';

const DEFAULT_HOTJAR_SV = 6;

/**
 * @param {string} src Full https URL
 */
function injectScript(src) {
  const trimmed = String(src || '').trim();
  if (!trimmed) return;

  if (!URL.canParse(trimmed)) {
    // eslint-disable-next-line no-console
    console.error('[analytics] invalid script URL:', trimmed);
    return;
  }

  const url = new URL(trimmed);
  if (url.protocol !== 'https:') {
    // eslint-disable-next-line no-console
    console.error('[analytics] script URL must be https:', trimmed);
    return;
  }

  if ([...document.scripts].some((s) => s.src === url.href)) return;

  const script = document.createElement('script');
  script.src = url.href;
  script.async = true;
  document.head.appendChild(script);
}

/**
 * @param {number} hjid
 * @param {number} hjsv
 * @param {string} src
 */
function injectInlineHotjar(hjid, hjsv, src) {
  /* eslint-disable no-underscore-dangle -- Hotjar public API */
  if (window.hj && window._hjSettings) return;

  window.hj = window.hj || function hj() {
    // eslint-disable-next-line prefer-rest-params -- Hotjar queue expects Arguments
    (window.hj.q = window.hj.q || []).push(arguments);
  };
  window._hjSettings = { hjid, hjsv };
  /* eslint-enable no-underscore-dangle */

  injectScript(src);
}

/**
 * @returns {{ hjid: number, hjsv: number, src: string }|null}
 */
function readHotjarConfig() {
  const rawId = getSetting('hotjarId').trim();
  if (!rawId) return null;

  const hostUrl = getSetting('hotjarHostUrl').trim();
  if (!hostUrl) {
    // eslint-disable-next-line no-console
    console.error('[analytics] hotjarId set but hotjarHostUrl is missing');
    return null;
  }

  const hjid = Number(rawId);
  if (!Number.isFinite(hjid) || hjid <= 0) {
    // eslint-disable-next-line no-console
    console.error('[analytics] hotjarId must be a positive number:', rawId);
    return null;
  }

  const rawSv = getSetting('hotjarVersion').trim();
  const hjsv = rawSv ? Number(rawSv) : DEFAULT_HOTJAR_SV;
  if (!Number.isFinite(hjsv) || hjsv <= 0) {
    // eslint-disable-next-line no-console
    console.error('[analytics] hotjarVersion must be a positive number:', rawSv);
    return null;
  }

  const src = `${hostUrl}${hjid}.js?sv=${hjsv}`;
  if (!URL.canParse(src) || !src.startsWith('https:')) {
    // eslint-disable-next-line no-console
    console.error('[analytics] invalid Hotjar script URL:', src);
    return null;
  }

  return { hjid, hjsv, src };
}

async function loadAnalyticsFromSiteConfig() {
  try {
    await whenSiteConfigReady();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[analytics] site-config unavailable; skipping Launch/Hotjar', error);
    return;
  }

  injectScript(getSetting('launch'));

  const hotjar = readHotjarConfig();
  if (hotjar) injectInlineHotjar(hotjar.hjid, hotjar.hjsv, hotjar.src);
}

loadAnalyticsFromSiteConfig();
