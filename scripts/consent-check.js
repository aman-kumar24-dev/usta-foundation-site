import { getMartechConfig } from './site-config.js';
import VENDORS from './consent-vendors.js';

/**
 * OneTrust consent gate for the vendors in consent-vendors.js (Analytics, Hotjar, Target).
 *
 * SDK id and stub URL come from site config (`onetrust.sdk`, `onetrust.src`),
 * including the authored /site-config sheet. The banner copy comes from OneTrust.
 * This module reads the visitor's choice, works out which vendors are allowed (each
 * vendor lists the OneTrust groups it needs) and tells consented.js and Target. Until
 * OneTrust has reported, all stay off.
 *
 * `?consent=accept` or `?consent=decline` overrides OneTrust for testing (and turns
 * gating on even where the config says consent is not required).
 * Do not use that query in production.
 */

/** Consent per vendor id (see consent-vendors.js); everything is off until known. */
const granted = Object.fromEntries(VENDORS.map(({ id }) => [id, false]));

function queryOverride() {
  const consent = new URLSearchParams(window.location.search).get('consent');
  if (consent === null) return null;
  return ['accept', 'true', '1', 'yes'].includes(consent.toLowerCase());
}

function activeGroups() {
  return String(window.OnetrustActiveGroups || '')
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
}

function allows(groupId) {
  const override = queryOverride();
  if (override !== null) return override;
  return activeGroups().includes(groupId);
}

function gtag() {
  window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
}

function installConsentModeDefault() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || gtag;
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
}

function updateConsentMode() {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', {
    analytics_storage: granted.analytics ? 'granted' : 'denied',
    ad_storage: granted.target ? 'granted' : 'denied',
    ad_user_data: granted.target ? 'granted' : 'denied',
    ad_personalization: granted.target ? 'granted' : 'denied',
  });
}

function expireCookie(name) {
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `${name}=; expires=${expires}; path=/`;
  document.cookie = `${name}=; expires=${expires}; path=/; domain=${window.location.hostname}`;
}

function cookieNames() {
  return document.cookie.split(';').map((part) => part.split('=')[0].trim()).filter(Boolean);
}

/** Drop the cookies of every vendor the visitor has not allowed. */
// function clearDeniedCookies() {
//   // the Experience Cloud visitor id is shared by Analytics and Target
//   const visitorIdUnused = !granted.analytics && !granted.target;
//   cookieNames().forEach((name) => {
//     const denied = VENDORS.some(({ id, cookies }) => !granted[id] && cookies.test(name))
//       || (visitorIdUnused && (name.startsWith('AMCV_') || name.startsWith('AMCVS_')));
//     if (denied) expireCookie(name);
//   });
// }

const meets = ({ groups }) => groups.every(allows);

function publish() {
  VENDORS.forEach((vendor) => { granted[vendor.id] = meets(vendor); });
  updateConsentMode();
  clearDeniedCookies();
  const state = { ...granted };
  window.dispatchEvent(new CustomEvent('consent.update', {
    detail: { consented: !!state.analytics, ...state },
  }));
  // aem.live convention: consent-dependent code lives in consented.js, which is
  // only requested once the visitor has allowed something.
  if (Object.values(state).some(Boolean)) {
    import('./consented.js').then(({ default: consented }) => consented(state));
  }
}

/**
 * @param {string} src OneTrust stub URL from site config
 * @param {string} sdk OneTrust domain-script id from site config
 */
function loadOneTrust(src, sdk) {
  if (document.querySelector('script[data-domain-script]')) return;
  window.OptanonWrapper = () => publish();
  window.addEventListener('OneTrustGroupsUpdated', () => publish());
  const script = document.createElement('script');
  const policy = window.trustedTypes && window.trustedTypes.defaultPolicy;
  script.src = policy ? policy.createScriptURL(src) : src;
  script.async = true;
  script.setAttribute('data-domain-script', sdk);
  script.setAttribute('charset', 'UTF-8');
  document.head.append(script);
}

/**
 * Run once the given vendor (see consent-vendors.js) is allowed.
 * Does not run the callback until OneTrust has reported.
 * @param {string} id vendor id, e.g. `target`
 * @param {Function} callback
 */
// eslint-disable-next-line import/prefer-default-export
export function onVendorConsent(id, callback) {
  if (granted[id]) {
    callback();
    return;
  }
  const listener = (event) => {
    if (!event.detail?.[id]) return;
    window.removeEventListener('consent.update', listener);
    callback();
  };
  window.addEventListener('consent.update', listener);
}

installConsentModeDefault();
getMartechConfig().then(({ site }) => {
  // Sheet says consentRequired=false: skip the consent workflow and load the
  // consented scripts straight away. An unavailable sheet leaves it undefined, so
  // that case stays fail-closed (nothing loads).
  if (site.consentRequired === false) {
    VENDORS.forEach(({ id }) => { granted[id] = true; });
    import('./consented.js').then(({ default: consented }) => consented({ ...granted }));
    return;
  }
  const { sdk, src } = site.onetrust || {};
  if (!sdk || !src) return;
  loadOneTrust(src, sdk);
});
if (queryOverride() !== null) publish();
