// Adobe Analytics via AppMeasurement.js - the legacy, self-hosted library,
// as opposed to Adobe Experience Platform Web SDK (which requires a paid
// AEP Datastream / Edge Network setup). Vendored from Adobe's official
// open-source release: https://github.com/adobe/appmeasurement (v2.27.0,
// matching the version seen in a real captured beacon on ustafoundation.com).
//
// Only imported once consent-check.js has determined the visitor consented
// (see consent-check.js's loadConsented()) - this file assumes consent is
// already granted; it does not check it again.

const APP_MEASUREMENT_PATH = `${window.hlx.codeBasePath}/scripts/vendor/AppMeasurement.js`;

// Confirmed live, from an actual captured beacon on ustafoundation.com.
const REPORT_SUITE = 'usta.global';
const TRACKING_SERVER = 'ustaglobal.112.2o7.net';

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadAppMeasurement() {
  // Loaded as a classic script, not a dynamic import: AppMeasurement.js
  // predates ES modules and relies on sloppy-mode globals - the same reason
  // Launch containers are loaded this way rather than via import().
  await loadClassicScript(APP_MEASUREMENT_PATH);

  // eslint-disable-next-line no-undef, new-cap
  const s = new AppMeasurement();
  s.account = REPORT_SUITE;
  s.trackingServer = TRACKING_SERVER;
  s.trackingServerSecure = TRACKING_SERVER;
  s.currencyCode = 'USD';

  s.pageName = document.title;
  s.prop17 = window.location.href;
  s.eVar17 = window.location.href;

  s.t();
  return s;
}

loadAppMeasurement();
