# Adobe Analytics (Adobe Experience Platform Tags + Analytics extension)

Implementation method: **Tags with the Adobe Analytics extension** (AppMeasurement,
no Edge Network). A Tags embed (loader) script is injected on every page; the
Analytics extension sends beacons straight to Adobe Analytics.

## How it loads

| File | Role |
|---|---|
| `scripts/analytics-config.js` | One entry per site: hosts, EDS site names, Tags embed URL per environment, `consentRequired` |
| `scripts/analytics.js` | Resolves site + environment from the hostname, gates on consent if required, injects the embed once (`async`) |
| `scripts/consent-check.js` | Exposes `onConsent(callback)`; placeholder consent (`?consent=accept`) until a real CMP is wired per site |
| `scripts/scripts.js` → `loadDelayed()` | `import('./donate.js').finally(() => import('./analytics.js'))` — ~3s after load; FundraiseUp stub exists before Tags rules run |

`head.html` is not touched. The CSP (`strict-dynamic`) allows scripts injected by our
nonce'd modules, and the Trusted Types default policy in `scripts.js` lets Tags
custom-code/Hotjar injection through (verified: no CSP/TT errors).

### Host → environment

| Host | Entry matched by | Embed used |
|---|---|---|
| `localhost`, `127.0.0.1` | the entry with `local: true` | `development` |
| `{ref}--{site}--{org}.aem.page` | `{site}--{org}` in `edsSites` | `development` |
| `{ref}--{site}--{org}.aem.live` | `{site}--{org}` in `edsSites` | `production` |
| any host in `productionHosts` | exact hostname | `production` |
| anything else / empty URL | — | nothing loads |

## Adding site 2 / site 3 (repoless)

Fill in the placeholder entry in `scripts/analytics-config.js`:

```js
{
  id: 'site-2',
  productionHosts: ['www.example.org', 'example.org'],
  edsSites: ['example-site--example-org'], // {site}--{org} from the aem.page host
  launch: {
    production: 'https://assets.adobedtm.com/<company>/<property>/launch-<hash>.min.js',
    development: 'https://assets.adobedtm.com/<company>/<property>/launch-<hash>-development.min.js',
  },
  consentRequired: true, // false only if the site needs no consent gate
},
```

If `consentRequired: true`, wire the site's CMP into `scripts/consent-check.js`
(`hasConsent()` + dispatch `consent.update` when the visitor decides). Until then
Tags only loads with `?consent=accept` (testing only).

## ustafoundation — current (interim) setup

- Library: existing **"USTA Foundation"** property, production environment
  `launch-b4bd8f30c678.min.js`, used **unchanged** for now. It also contains
  Adobe Target v2 and a Hotjar rule. Plan: replace with an Analytics-only library
  (swap the URL in the config — no code change).
- No development/staging embed is published under the same name
  (`-development`/`-staging` 404) → preview + local also use the production
  library, so **preview traffic lands in `usta.global`**. Replace the `development`
  URL with the Development environment embed when available.
- `consentRequired: false` (no consent gate on ustafoundation.com).

### What the library sends

| Variable | Value |
|---|---|
| Report suite | production `usta.global`; dev/staging `usta.ustacomdev` |
| `pageName` | `foundation:` + `document.title` |
| `eVar17` / `prop17` | page URL |
| `campaign` (v0) | `?cid=` query parameter |
| page view | `s.t()` ("page load" rule) |
| FundraiseUp checkout open | `s.tl` — event9, pageName `ustafoundation:fundraiseup:DONATE`, eVar/prop61 campaign id, eVar/prop62 campaign name |
| FundraiseUp donation complete | `s.tl` — event67, eVar76 amount |
| Download links | automatic (doc, pdf, xls, … list in the extension) |

### Known gaps (interim library)

- Rules **"DIG-4755 links"** and **"iframe buttons"** use jQuery `$` and the old AEM
  class names → they fail (`$ is not defined`, visible only with
  `_satellite.setDebug(true)`); nav/button/text/social click tracking does not fire.
  Even on the old site these rules omit `events` from `linkTrackVars`, so event7/event9
  were never sent on clicks.
- `pageName` depends on `document.title`. Some pages have titles that differ from
  the live site (their Title metadata is missing, so the H1 is used):
  who-we-are, what-we-do, our-impact, special-funds. Fix the Title metadata in
  content to keep reporting continuous.
- Loaded ~3s after page load: very short visits are not counted; Target content can flicker.
- Performance: on throttled mobile the library costs ~3.5s of main-thread time
  (Target at.js is a large part) when Lighthouse captures it. See `MIGRATION.md`.

## Test checklist

1. Local: open `/en/home?cid=test`, wait ~5s.
   - `_satellite.property.name === 'USTA Foundation'`
   - One `b/ss/…` request: `pageName=foundation:Home`, `v17`/`c17` = URL, `v0=test`, `mid` present.
2. `_satellite.setDebug(true)` + reload → rule log shows "set global variables" before
   "page load" (Page Bottom rules still fire with async loading — no `_satellite.pageBottom()` needed).
3. Consent path: set the site's `consentRequired: true` locally → no adobedtm/omtrdc/demdex
   requests without `?consent=accept`; loads with it. Revert.
4. Unknown host (e.g. the machine's IP on port 3000) → nothing loads, no console errors.
