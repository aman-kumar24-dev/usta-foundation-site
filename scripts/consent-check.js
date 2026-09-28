let consentedLoaded = false;

/**
 * Dummy consent / CMP stand-in (OneTrust later).
 *
 * `consentRequired` from site-config.json:
 *   false → skip this workflow entirely; load consented scripts with no prompt
 *   true  → enter the workflow; visitor must accept before consented scripts load
 *           (default inside the workflow = declined until they accept)
 *
 * Test override when the workflow is active:
 *   ?consent=accept   grant
 *   ?consent=decline  deny
 *
 * @returns {boolean} true only if the visitor has accepted (workflow path)
 */
function hasUserAcceptedConsent() {
  const consent = new URLSearchParams(window.location.search).get('consent');
  if (consent !== null) {
    return ['accept', 'true', '1', 'yes'].includes(consent.toLowerCase());
  }
  // Inside the consent workflow, default is declined until the user accepts.
  return false;
}

/**
 * Loads consented scripts once (analytics, martech, etc.).
 */
function loadConsented() {
  if (consentedLoaded) return;
  consentedLoaded = true;
  import('./consented.js');
}

/**
 * Reads site-config, then either skips consent or runs the consent workflow.
 */
async function onConsentUpdate() {
  const { whenSiteConfigReady, getSetting } = await import('./site-config.js');

  try {
    await whenSiteConfigReady();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[consent] site-config unavailable; consented scripts not loaded', error);
    return;
  }

  const consentRequired = getSetting('consentRequired').toLowerCase() === 'true';

  // Config says consent is not required → bail out of the consent workflow.
  if (!consentRequired) {
    window.dispatchEvent(new CustomEvent('consent.update', {
      detail: { consentRequired: false, consented: true },
    }));
    loadConsented();
    return;
  }

  // consentRequired === true → enter workflow; acceptance is decided here.
  const consented = hasUserAcceptedConsent();
  window.dispatchEvent(new CustomEvent('consent.update', {
    detail: { consentRequired: true, consented },
  }));
  if (consented) {
    loadConsented();
  }
}

onConsentUpdate();
