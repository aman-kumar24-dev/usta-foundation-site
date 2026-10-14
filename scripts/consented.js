/**
 * Consent-dependent code (aem.live convention, https://www.aem.live/developer/cmp-integration).
 *
 * consent-check.js imports this only once the visitor has allowed something (or the
 * sheet says consent is not required), and calls the default export again on every
 * consent change.
 *
 * - Adobe Tags (Analytics) and Hotjar load here, after the delayed phase has started.
 *   A visitor who consents mid-visit gets them immediately.
 * - Target stays in target.js: it needs the decision before first paint.
 */

let analyticsRequested = false;

/** Resolves once scripts.js has started the delayed phase. */
function delayedPhase() {
  if (window.hlx?.delayedStarted) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('delayed.start', resolve, { once: true });
  });
}

/**
 * @param {{analytics: boolean, target: boolean}} consent
 */
export default function consented({ analytics }) {
  if (analytics && !analyticsRequested) {
    analyticsRequested = true;
    delayedPhase().then(() => {
      import('./analytics.js');
      // Hotjar is loaded from the /site-config sheet (hotjarId, hotjarHostUrl, hotjarVersion)
      import('./hotjar-router.js');
    });
  }
}
