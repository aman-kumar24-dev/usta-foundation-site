/**
 * Per-site Adobe Analytics (Adobe Experience Platform Tags / Launch) settings.
 *
 * This codebase is shared (repoless) by several sites. Each entry describes one
 * site; scripts/analytics.js picks the entry matching the current hostname:
 *   - localhost / 127.0.0.1        → the entry with `local: true`, `development` URL
 *   - {ref}--{site}--{org}.aem.page → entry listing `{site}--{org}` in `edsSites`,
 *                                     `development` URL
 *   - {ref}--{site}--{org}.aem.live → same match, `production` URL
 *   - any host in `productionHosts` → `production` URL
 * An entry with an empty URL (or a host with no entry) loads nothing.
 *
 * Tags embed URLs are public (served to every visitor) — they are not secrets.
 *
 * `consentRequired: true` defers loading until consent is granted (see
 * scripts/consent-check.js `onConsent`). Sites that don't need a consent gate
 * load Tags straight away in the delayed phase.
 */
export default [
  {
    id: 'ustafoundation',
    local: true,
    productionHosts: ['www.ustafoundation.com', 'ustafoundation.com'],
    edsSites: ['usta-foundation-site--aman-kumar24-dev', 'foundation-usta--aemdemos'],
    launch: {
      // Existing "USTA Foundation" property, production environment (report suite
      // usta.global). Interim: still includes Target + Hotjar — swap for the
      // Analytics-only library once it is published.
      production: 'https://assets.adobedtm.com/15c795eb812c/e99b4446eb17/launch-b4bd8f30c678.min.js',
      // No development/staging embed is published under this property's naming
      // (the -development/-staging variants 404), so preview uses the production
      // library for now — preview traffic lands in usta.global. Replace with the
      // Development environment embed URL (report suite usta.ustacomdev) when available.
      development: 'https://assets.adobedtm.com/15c795eb812c/e99b4446eb17/launch-b4bd8f30c678.min.js',
    },
    consentRequired: false,
  },
  {
    // PLACEHOLDER — fill in hosts, EDS site names and embed URLs when known.
    id: 'site-2',
    productionHosts: [],
    edsSites: [],
    launch: { production: '', development: '' },
    consentRequired: true,
  },
  {
    // PLACEHOLDER — fill in hosts, EDS site names and embed URLs when known.
    id: 'site-3',
    productionHosts: [],
    edsSites: [],
    launch: { production: '', development: '' },
    consentRequired: true,
  },
];
