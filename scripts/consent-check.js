import { getSiteConfig } from './site-config.js';

/**
 * OneTrust consent gate for Adobe Analytics and Adobe Target.
 *
 * SDK id and stub URL come from site config (`onetrust.sdk`, `onetrust.src`),
 * including the authored /site-config sheet. The banner copy comes from OneTrust.
 * This module reads the visitor's choice and tells Analytics (Performance, C0002)
 * and Target (Targeting, C0004) when they may load. Until OneTrust has reported,
 * both stay off.
 *
 * `?consent=accept` or `?consent=decline` overrides OneTrust for testing.
 * Do not use that query in production.
 */

/** Performance Cookies — Adobe Analytics. */
const ANALYTICS_GROUP = 'C0002';
/** Targeting Cookies — Adobe Target. */
const TARGET_GROUP = 'C0004';

const ANALYTICS_COOKIES = /^(s_cc|s_sq|s_fid|s_vi|s_ecid|sat_track)$/;
const TARGET_COOKIES = /^(mbox|at_check|mboxEdgeCluster)$/;

let analyticsGranted = false;
let targetGranted = false;

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
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    ad_storage: targetGranted ? 'granted' : 'denied',
    ad_user_data: targetGranted ? 'granted' : 'denied',
    ad_personalization: targetGranted ? 'granted' : 'denied',
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

/** Drop Adobe cookies for any category the visitor has not allowed. */
function clearDeniedCookies() {
  const bothDenied = !analyticsGranted && !targetGranted;
  cookieNames().forEach((name) => {
    const analyticsCookie = ANALYTICS_COOKIES.test(name);
    const targetCookie = TARGET_COOKIES.test(name);
    const visitorCookie = bothDenied && (name.startsWith('AMCV_') || name.startsWith('AMCVS_'));
    const denied = (!analyticsGranted && analyticsCookie)
      || (!targetGranted && targetCookie)
      || visitorCookie;
    if (denied) expireCookie(name);
  });
}

function publish() {
  analyticsGranted = allows(ANALYTICS_GROUP);
  targetGranted = allows(TARGET_GROUP);
  updateConsentMode();
  clearDeniedCookies();
  window.dispatchEvent(new CustomEvent('consent.update', {
    detail: {
      consented: analyticsGranted,
      analytics: analyticsGranted,
      target: targetGranted,
    },
  }));
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
 * Run once Analytics (Performance) consent is granted.
 * @param {Function} callback
 */
export function onConsent(callback) {
  if (analyticsGranted) {
    callback();
    return;
  }
  const listener = (event) => {
    if (!event.detail?.analytics) return;
    window.removeEventListener('consent.update', listener);
    callback();
  };
  window.addEventListener('consent.update', listener);
}

/**
 * Run once Target (Targeting) consent is granted.
 * Does not run the callback until OneTrust has reported.
 * @param {Function} callback
 */
export function onTargetConsent(callback) {
  if (targetGranted) {
    callback();
    return;
  }
  const listener = (event) => {
    if (!event.detail?.target) return;
    window.removeEventListener('consent.update', listener);
    callback();
  };
  window.addEventListener('consent.update', listener);
}

installConsentModeDefault();
getSiteConfig().then(({ site }) => {
  const { sdk, src } = site.onetrust || {};
  if (!sdk || !src) return;
  loadOneTrust(src, sdk);
});
if (queryOverride() !== null) publish();
