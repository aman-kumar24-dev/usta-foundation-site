/**
 * Consent vendors: one entry per tool that must wait for the visitor's consent.
 *
 * - `id`      name used in consent state and events (`granted.analytics`, ...)
 * - `groups`  OneTrust groups that must ALL be on before the tool may run
 * - `cookies` cookie names deleted when the tool is not allowed
 * - `load`    loads the tool (run once by consented.js, after the delayed phase);
 *             leave it out when something else starts the tool (`eager`)
 *
 * Adding a vendor means adding an entry here; consent-check.js and consented.js loop
 * over this list.
 *
 * Analytics, Hotjar and Target follow usta.com: its Launch tag (Analytics, Target, Hotjar)
 * stays blocked until Performance (C0002), Targeting (C0004) and Social (C0005) are all on.
 */
const ALL_THREE = ['C0002', 'C0004', 'C0005'];

export default [
  {
    id: 'analytics',
    groups: ALL_THREE,
    cookies: /^(s_cc|s_sq|s_fid|s_vi|s_ecid|sat_track)$/,
    load: () => import('./analytics.js'),
  },
  {
    id: 'hotjar',
    groups: ALL_THREE,
    cookies: /^_hj/,
    // Hotjar is loaded from the /site-config sheet (hotjarId, hotjarHostUrl, hotjarVersion)
    load: () => import('./hotjar-router.js'),
  },
  {
    id: 'target',
    groups: ALL_THREE,
    cookies: /^(mbox|at_check|mboxEdgeCluster)$/,
    eager: true, // started by target.js: it needs the decision before first paint
  },
];
