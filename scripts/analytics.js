/**
 * Adobe Analytics loader (Adobe Experience Platform Tags with the Analytics
 * extension). Loaded in the delayed phase from scripts.js.
 *
 * Resolves the current site + environment from the hostname (see
 * analytics-config.js), waits for consent when that site requires it, then
 * injects the site's Tags embed code once, asynchronously.
 */
import SITES from './analytics-config.js';
import { onConsent } from './consent-check.js';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

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

/**
 * Inject the Tags embed code once.
 * @param {string} src Tags library URL
 */
function loadTags(src) {
  // eslint-disable-next-line no-underscore-dangle
  if (window._satellite || document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.append(script);
}

const match = resolveSite(window.location.hostname);
const src = match?.site.launch?.[match.env];
if (src) {
  if (match.site.consentRequired) onConsent(() => loadTags(src));
  else loadTags(src);
}
