/**
 * Per-site martech settings: Adobe Analytics (Adobe Experience Platform Tags /
 * Launch) and Adobe Target (at.js).
 *
 * The SOURCE OF TRUTH is each site's authored `/site-config` sheet in DA
 * (served as /site-config.json once previewed/published) — admins edit it there;
 * see getSiteConfig() below. The SITES entries in this file are only FALLBACK
 * DEFAULTS, used for any key that the sheet doesn't set (or sets invalidly) and
 * when the sheet is missing.
 *
 * This codebase is shared (repoless) by several sites. Each entry describes one
 * site; resolveSite() picks the entry matching the current hostname:
 *   - localhost / 127.0.0.1        → the entry with `local: true`, `development` env
 *   - {ref}--{site}--{org}.aem.page → entry listing `{site}--{org}` in `edsSites`,
 *                                     `development` env
 *   - {ref}--{site}--{org}.aem.live → same match, `production` env
 *   - any host in `productionHosts` → `production` env
 * An entry with an empty URL (or a host with no entry) loads nothing.
 *
 * Tags embed URLs are public (served to every visitor) — they are not secrets.
 *
 * `consentRequired: true` defers loading until consent is granted (see
 * scripts/consent-check.js `onConsent`). Sites that don't need a consent gate
 * load Tags straight away in the delayed phase.
 *
 * `donateBeacons` (optional) maps donate.js events (see scripts/donate.js) to
 * Analytics link beacons: `events`, fixed `set` variables, and `map` from an
 * event field to the variables that receive its value. A beacon is only sent
 * when at least one mapped field has a value.
 *
 * `target` configures Adobe Target (scripts/target.js). at.js only runs when
 * `enabled` is true AND the page has `Target` metadata. `a4t: true` loads the
 * Experience Cloud ID service (VisitorAPI) before at.js so Target activities
 * report through Analytics. Never enable it while the site's Tags library still
 * contains the Adobe Target extension — two at.js instances conflict.
 */
const SITES = [
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
    // Same variables as the source site's "FundraiseUp Donation Checkout Open" /
    // "FundraiseUp Donation Complete" Tags rules.
    donateBeacons: {
      checkoutOpen: {
        linkName: 'Fundraise Up Donation Checkout Open',
        events: 'event9',
        set: { pageName: 'ustafoundation:fundraiseup:DONATE' },
        map: { campaignId: ['prop61', 'eVar61'], campaignName: ['prop62', 'eVar62'] },
      },
      donationComplete: {
        linkName: 'Fundraise Up Donation Complete',
        events: 'event67',
        map: { amount: ['eVar76'] },
      },
    },
    // Same account settings as the "Adobe Target v2" extension in the Tags
    // property. Cutover: remove that extension + the "Load Target" rule from Tags,
    // publish, then set `enabled: true`.
    target: {
      enabled: false,
      clientCode: 'unitedstatestennisas',
      serverDomain: 'unitedstatestennisas.tt.omtrdc.net',
      imsOrgId: 'A6D83F7A5347FCE90A490D44@AdobeOrg',
      a4t: true,
    },
  },
  {
    // PLACEHOLDER — fill in hosts, EDS site names and embed URLs when known.
    id: 'site-2',
    productionHosts: [],
    edsSites: [],
    launch: { production: '', development: '' },
    consentRequired: true,
    target: { enabled: false },
  },
  {
    // PLACEHOLDER — fill in hosts, EDS site names and embed URLs when known.
    id: 'site-3',
    productionHosts: [],
    edsSites: [],
    launch: { production: '', development: '' },
    consentRequired: true,
    target: { enabled: false },
  },
];

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/**
 * Find the site entry and environment for a hostname.
 * @param {string} [hostname] defaults to the current page's hostname
 * @returns {{site: object, env: 'development'|'production'}|null}
 */
export function resolveSite(hostname = window.location.hostname) {
  if (LOCAL_HOSTS.includes(hostname)) {
    const site = SITES.find((s) => s.local);
    return site ? { site, env: 'development' } : null;
  }
  // repoless EDS hosts: {ref}--{site}--{org}.aem.page|live
  const eds = hostname.match(/^([^.]+)\.aem\.(page|live)$/);
  if (eds) {
    const siteKey = eds[1].split('--').slice(-2).join('--');
    const site = SITES.find((s) => s.edsSites.includes(siteKey));
    return site ? { site, env: eds[2] === 'page' ? 'development' : 'production' } : null;
  }
  const site = SITES.find((s) => s.productionHosts.includes(hostname));
  return site ? { site, env: 'production' } : null;
}

/* ---------- authored /site-config sheet ---------- */

const SHEET_URL = '/site-config.json';

/** Environment from the hostname alone (sites without a code entry). */
function envFromHost(hostname) {
  return LOCAL_HOSTS.includes(hostname) || hostname.endsWith('.aem.page') ? 'development' : 'production';
}

const toBool = (v) => ({ true: true, false: false })[String(v).trim().toLowerCase()];

// key → [validator/parser returning undefined when invalid, setter]
const SETTINGS = {
  'launch.production': [(v) => (/^https:\/\/assets\.adobedtm\.com\/[\w./-]+\.js$/.test(v) || v === '' ? v : undefined), (c, v) => { c.launch.production = v; }],
  'launch.development': [(v) => (/^https:\/\/assets\.adobedtm\.com\/[\w./-]+\.js$/.test(v) || v === '' ? v : undefined), (c, v) => { c.launch.development = v; }],
  consentRequired: [toBool, (c, v) => { c.consentRequired = v; }],
  'target.enabled': [toBool, (c, v) => { c.target.enabled = v; }],
  'target.clientCode': [(v) => (/^[\w-]+$/.test(v) ? v : undefined), (c, v) => { c.target.clientCode = v; }],
  'target.serverDomain': [(v) => (/^[\w-]+\.tt\.omtrdc\.net$/.test(v) ? v : undefined), (c, v) => { c.target.serverDomain = v; }],
  'target.imsOrgId': [(v) => (/^[A-F0-9]+@AdobeOrg$/i.test(v) ? v : undefined), (c, v) => { c.target.imsOrgId = v; }],
  'target.a4t': [toBool, (c, v) => { c.target.a4t = v; }],
};

function warn(message) {
  // eslint-disable-next-line no-console
  console.warn(`[site-config] ${message}`);
}

/** "a=b; c=d" → { a: 'b', c: 'd' } */
function parsePairs(text) {
  return String(text || '').split(';').map((p) => p.trim()).filter(Boolean)
    .reduce((acc, pair) => {
      const [k, ...rest] = pair.split('=');
      if (k && rest.length) acc[k.trim()] = rest.join('=').trim();
      return acc;
    }, {});
}

const VARIABLE = /^(eVar\d+|prop\d+|pageName|channel|campaign)$/;

/** donate-beacons tab rows → donateBeacons object (invalid rows skipped). */
function parseDonateBeacons(rows) {
  return rows.reduce((beacons, row) => {
    const event = String(row.event || '').trim();
    const events = String(row.events || '').replace(/\s/g, '');
    const set = parsePairs(row.set);
    const map = Object.fromEntries(Object.entries(parsePairs(row.map))
      .map(([field, vars]) => [field, vars.split(',').map((v) => v.trim()).filter(Boolean)]));
    const varsOk = Object.keys(set).every((k) => VARIABLE.test(k))
      && Object.values(map).every((vars) => vars.length && vars.every((v) => VARIABLE.test(v)));
    if (!/^\w+$/.test(event) || !/^event\d+(,event\d+)*$/.test(events) || !varsOk || !Object.keys(map).length) {
      warn(`donate-beacons: ignoring invalid row "${event}"`);
      return beacons;
    }
    beacons[event] = {
      linkName: String(row.linkName || event).trim(), events, set, map,
    };
    return beacons;
  }, {});
}

/** Apply the sheet over a copy of the defaults. */
function applySheet(defaults, json) {
  const config = {
    ...defaults,
    launch: { production: '', development: '', ...defaults.launch },
    target: { enabled: false, ...defaults.target },
  };
  const settings = json?.settings?.data || (json?.[':type'] === 'sheet' ? json.data : []) || [];
  settings.forEach(({ key, value }) => {
    const k = String(key || '').trim();
    if (!k) return;
    const entry = SETTINGS[k];
    if (!entry) { warn(`unknown key "${k}"`); return; }
    const parsed = entry[0](String(value ?? '').trim());
    if (parsed === undefined) { warn(`invalid value for "${k}" — using default`); return; }
    entry[1](config, parsed);
  });
  const beaconRows = json?.['donate-beacons']?.data;
  if (beaconRows?.length) config.donateBeacons = parseDonateBeacons(beaconRows);
  return config;
}

let siteConfigPromise;

/**
 * The current site's martech config: code defaults (by hostname) overridden by
 * the authored /site-config sheet. Fetched once per page.
 * @returns {Promise<{site: object, env: 'development'|'production'}>}
 */
export function getSiteConfig() {
  if (!siteConfigPromise) {
    siteConfigPromise = (async () => {
      const { hostname } = window.location;
      const match = resolveSite(hostname);
      const env = match?.env || envFromHost(hostname);
      const defaults = match?.site || { id: hostname };
      try {
        const resp = await fetch(SHEET_URL);
        if (!resp.ok) {
          if (resp.status !== 404) warn(`${SHEET_URL}: HTTP ${resp.status} — using code defaults`);
          return { site: defaults, env };
        }
        return { site: applySheet(defaults, await resp.json()), env };
      } catch (e) {
        warn(`${SHEET_URL} unreadable — using code defaults`);
        return { site: defaults, env };
      }
    })();
  }
  return siteConfigPromise;
}

export default SITES;
