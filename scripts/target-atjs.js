// Adobe Target integration via at.js 2.0 - the legacy, self-hosted library,
// as opposed to Adobe Experience Platform Web SDK (which requires a paid
// AEP Datastream / Edge Network setup). at.js is self-hosted: download the
// built bundle from the Target admin console (Setup > Implementation >
// at.js) into scripts/vendor/at.js.
//
// Loaded per Adobe's official "without a tag manager" guide - a classic,
// blocking <script> tag directly in <head> (see head.html), not a deferred
// import(). window.targetGlobalSettings is set there too, before at.js
// loads, per that same guide. By the time this module's loadTargetEager()
// runs (from scripts.js's loadEager()), at.js has already loaded and run -
// this file only needs to trigger the view evaluation.
//
// This site has no consent-management requirement, so this runs
// unconditionally - same as consented.js/AppMeasurement.js.
//
// Docs referenced:
// https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/deploy-at-js/implement-target-without-a-tag-manager
// https://experienceleague.adobe.com/en/docs/target-learn/tutorials/implementation/implement-atjs-20-in-a-single-page-application

/**
 * Fires a Target view evaluation for the current page. This site has no
 * client-side router, so there is only ever one view per page load (no
 * SPA-style triggerView() on navigation needed).
 */
// eslint-disable-next-line import/prefer-default-export
export function loadTargetEager() {
  if (!window.adobe?.target) return;
  const viewName = document.title || window.location.pathname;
  window.adobe.target.triggerView(viewName, { page: true });
}
