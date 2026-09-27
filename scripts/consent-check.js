let consentedLoaded = false;
let consentGranted = false;

/**
 * Dummy consent implementation.
 *
 * By default consent is declined, so consented scripts (analytics, martech, etc.)
 * are not loaded. This stands in for a real CMP (OneTrust, etc.) and can be
 * swapped out later.
 *
 * The default can be overridden with a query parameter for testing:
 *   ?consent=accept   grant consent (loads consented.js)
 *   ?consent=decline  decline consent (default behavior)
 *
 * @returns {boolean} true if the user has consented
 */
function hasConsent() {
  const consent = new URLSearchParams(window.location.search).get('consent');
  if (consent !== null) {
    return ['accept', 'true', '1', 'yes'].includes(consent.toLowerCase());
  }
  // default: decline
  return false;
}

/**
 * Loads consented scripts once consent is available.
 */
function loadConsented() {
  if (consentedLoaded) return;
  consentedLoaded = true;
  import('./consented.js');
}

/**
 * Notifies listeners of the current consent state and loads consented
 * scripts if consent has been granted.
 */
function onConsentUpdate() {
  const consented = hasConsent();
  consentGranted = consented;
  window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented } }));
  if (consented) {
    loadConsented();
  }
}

/**
 * Runs a callback once consent is granted — immediately if it already is,
 * otherwise on the first `consent.update` event that grants it.
 * @param {Function} callback
 */
// eslint-disable-next-line import/prefer-default-export
export function onConsent(callback) {
  if (consentGranted) {
    callback();
    return;
  }
  const listener = (e) => {
    if (!e.detail?.consented) return;
    window.removeEventListener('consent.update', listener);
    callback();
  };
  window.addEventListener('consent.update', listener);
}

onConsentUpdate();
