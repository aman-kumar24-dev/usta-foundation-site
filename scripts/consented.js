// Adobe Analytics via AppMeasurement.js - the legacy, self-hosted library, per
// Adobe's official implementation guide:
// https://experienceleague.adobe.com/en/docs/analytics/implementation/js/overview
//
// Loaded as a classic script (not dynamic import()) - it predates ES modules
// and relies on the sloppy-mode global `s_gi`, matching Adobe's own docs:
// a <script> tag, then a script block calling s_gi().
//
// VisitorAPI.js (real Marketing Cloud Visitor ID) intentionally not wired in
// yet - not needed for now; without it, s_gi() falls back to a local `fid`.
//
// This site has no consent-management requirement, so this is imported
// unconditionally from loadDelayed() in scripts.js.

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
  await loadClassicScript(APP_MEASUREMENT_PATH);

  // eslint-disable-next-line no-undef
  const s = s_gi(REPORT_SUITE);
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
