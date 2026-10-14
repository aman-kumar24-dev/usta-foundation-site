# Martech

Marketing technology (analytics, session recording, personalisation, donations, consent) is
configured per environment in the authored `/configs/site-config` sheet and loaded by
`scripts/martech/loader.js`. Each environment is its own DA site with its own sheet, so the code
has no environment logic. A vendor is switched on, off or changed in the sheet, not in code.

## 1. The config: `/configs/site-config`

One DA sheet, **one tab per page-load phase**, each with `key | value` columns:

| Tab | Loaded | Holds |
|---|---|---|
| `eager` | before the first section on Target pages; elsewhere when a later phase first needs `consentRequired` | `consentRequired`, Target |
| `lazy` | in the lazy phase, when a lazy-phase module needs it | Fundraise Up, OneTrust |
| `delayed` | in the delayed phase (3 s after the lazy phase) | Launch, Hotjar |

- Each tab is fetched on its own, once per page, when its phase first needs it:
  `/configs/site-config.json?sheet=<tab>` (`scripts/site-config.js` `getSheet(tab)`). This keeps
  each request small — budget ~1.5 KB per tab; today's tabs are 270–400 B raw, <200 B on the wire.
- Add a new setting to the tab of the phase that uses it. Add a new tab only for a genuinely new
  concern; keep the three tabs (with one tab only, EDS serves it as `default` and `?sheet=` stops
  working). Larger tables that are only needed later live in their own document.
- Values are trimmed; rows without a key are reported and skipped; unknown keys are ignored.
- A missing tab or setting means that feature is off, with one `[site-config]` warning when
  something is wrong. Exception: `consentRequired` (below).
- Everything in the sheet is public, like the code. Never put secrets in it.

### Row types

| Key | Value | Effect |
|---|---|---|
| `consentRequired` (eager tab) | `true` / `false` | the one consent setting for every vendor — in the eager tab because it decides whether Target may load before the first section; anything else, or no row → warning, consent treated as required |
| `script.<name>` | https URL | the script is injected once, async, in that tab's phase — after consent when required |
| `<module>.enabled` | `true` / `false` | runs `scripts/martech/<module>.js` in that tab's phase (vendors that need code) |
| `<module>.<setting>` | | that module's settings |

### Permissions (DA org config)

Martech admins write, other authors read, on `/<site>/configs/site-config.json` (non-HTML files
need the exact path with `.json`; per identity the longest rule wins, so every other author needs
the read row), or a folder rule `/<site>/configs/+**`.

### Add a site or environment

Create its DA site, add `/configs/site-config` with the three tabs and the rows of the vendors it
uses, add the permission rows, Preview and Publish. No code change.

## 2. How it loads

`scripts.js` calls `runPhase(<phase>)` from the page-load phases. For the phase's tab, the loader:

1. reads `consentRequired` (`isConsentRequired()`) if the tab lists anything;
2. injects every `script.<name>` URL (https only; skipped if the page already has that script),
   waiting for consent when it is required — without holding the phase;
3. runs every module with `<module>.enabled=true`: imports `scripts/martech/<module>.js` (names
   `/^[a-z][a-z0-9]*$/`, folder fixed in code) and calls its default export with its settings and
   `ctx`.

| `ctx` field | Meaning |
|---|---|
| `consentRequired` | the resolved `consentRequired` value |
| `whenConsented()` | resolves once the visitor has consented; never resolves otherwise |
| `warn(message)` | `console.warn('[martech] <module>: …')` |

Modules run in parallel, once per page; a failing module never blocks another. Modules never
import each other and never import `consent-check.js` (its module body starts the consent workflow).

### Consent

- `consentRequired=false` → scripts and modules load in their phase.
- `consentRequired=true` → scripts wait for consent; modules decide via `ctx` (e.g. Target loads
  only after consent, without holding the first paint).
- Consent is signalled by the `consent.update` window event (`{ detail: { consented } }`); the
  latest state is kept in `window.hlx.consent`. Today `scripts/consent-check.js` is a placeholder
  CMP (`?consent=accept` / `?consent=decline`) loaded in the delayed phase; OneTrust will replace it.

### Hooks in `scripts.js`

Every martech line in `scripts.js` carries a `martech:` comment.

| Phase | Hook | Added by |
|---|---|---|
| delayed | end of `loadDelayed`: `import('./martech/loader.js').then((m) => m.runPhase('delayed'))` | Martech 1/4 |

### Window contracts

| Name | Set by | Used by |
|---|---|---|
| `consent.update` event, `window.hlx.consent` | consent-check.js (later OneTrust) | loader, modules |
| `window.hlx.siteConfig` (`getSheet`, `isConsentRequired`) | site-config.js | debugging, tests |

### After an Adobe code drop

Adobe updates `scripts.js`, `consent-check.js`, `consented.js`, `donate.js` and `MIGRATION.md`
wholesale. After merging a drop into develop, check:

```sh
git grep -n 'martech:' scripts/scripts.js        # one line per hook in the table above
git grep -n 'isConsentRequired\|hlx.consent' scripts/consent-check.js
git grep -n 'Martech restructure' MIGRATION.md   # our log entries are still there, in date order
```

## 3. Adobe Analytics (Adobe Experience Platform Tags)

Adobe Analytics through a Tags (Launch) property with the Adobe Analytics extension
(AppMeasurement). The site only injects the property's embed script; the library sends the page
view and runs its own rules.

| Tab | Key | Value |
|---|---|---|
| delayed | `script.launch` | the Tags embed URL (`https://assets.adobedtm.com/…/launch-….min.js`) |

- **When:** the delayed phase, so Tags stays out of LCP and standard Lighthouse runs; after consent
  when `consentRequired` is `true`.
- **Kill switch:** remove or blank `script.launch`.
- **ustafoundation:** production uses USTA's existing "USTA Foundation" property (interim library
  `launch-b4bd8f30c678.min.js`). It still contains Adobe Target and a Hotjar rule, which must be
  removed before site code loads those vendors in production. Development uses the test-org property
  "EDS Migration - Main Site". The library sets `pageName` = `foundation:` + `document.title`, so
  page titles must match the old site.

## 4. Hotjar

_Added by Martech 2/4. Until then develop's `hotjar-router.js` loads Hotjar through
`consent-check.js` → `consented.js`, from the delayed-tab rows `hotjarId`, `hotjarHostUrl`,
`hotjarVersion`._

## 5. Adobe Target

_Added by Martech 3/4._

## 6. Fundraise Up

_Added by Martech 4/4. Until then develop's `donate.js` loads the widget in the delayed phase._

## 7. Quality gate and tests

- Project gate (`AGENTS.md`): `npm run lint`, `node tools/quality/breakpoint-check.mjs`,
  `npm run test:a11y -- <url>`; `check:overflow`, `check:typography` and `check:svg` only apply to
  CSS / layout / SVG changes.
- Martech behaviour is checked in a browser with the config tabs served in variants (Playwright
  routing) and vendor requests answered locally, so test hits never reach the vendors. The martech
  test scripts are kept on the `aem-coder-branch` branch (`tools/martech-tests/`).
