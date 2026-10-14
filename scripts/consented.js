/**
 * Consent-dependent code (aem.live convention, https://www.aem.live/developer/cmp-integration).
 *
 * consent-check.js imports this only once the visitor has allowed something (or the
 * sheet says consent is not required), and calls the default export again on every
 * consent change.
 *
 * Each vendor in consent-vendors.js that is allowed and has a `load` is loaded once,
 * after the delayed phase has started. A visitor who consents mid-visit gets it
 * immediately. Vendors marked `eager` (Target) are started elsewhere: Target needs
 * the decision before first paint, so target.js handles it.
 */
import VENDORS from './consent-vendors.js';

const requested = new Set();

/** Resolves once scripts.js has started the delayed phase. */
function delayedPhase() {
  if (window.hlx?.delayedStarted) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('delayed.start', resolve, { once: true });
  });
}

/**
 * @param {Object<string, boolean>} consent whether each vendor id is allowed
 */
export default function consented(consent) {
  VENDORS.forEach(({ id, load }) => {
    if (!load || !consent[id] || requested.has(id)) return;
    requested.add(id);
    delayedPhase().then(load);
  });
}
