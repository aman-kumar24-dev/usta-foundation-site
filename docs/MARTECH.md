# Martech

Marketing technology (analytics, session recording, personalisation, donations, consent) is
configured per environment in the authored `/configs/site-config` sheet and loaded by
`scripts/martech/loader.js`. Each environment is its own DA site with its own sheet, so the code
has no environment logic. A vendor is switched on, off or changed in the sheet, not in code.

## Overview

![Martech loading: page phases, loader, consent gate, vendor modules and tags, with the per-site config sheet](assets/martech.svg)

1. `scripts.js` calls the loader at the end of each page-load phase (`runPhase`).
2. The loader reads that phase's tab of the site config sheet through `site-config.js`.
3. When consent is required, vendor loading waits for the `consent.update` event.
4. Plain `script.<name>` rows are injected directly; vendors that need setup first run through
   their module in `scripts/martech/`.
5. Martech admins edit the sheet in DA. Each site has its own sheet in its own content, so the
   same code serves every site and environment.

Full architecture of the site: see the [README](../README.md#architecture).

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
| `script.<name>` | https URL | loaded once in that tab's phase, after consent when required: by the module `scripts/martech/<name>.js` if there is one (scripts that need page setup first, e.g. Hotjar §4), otherwise as a plain async script tag |
| `<module>.enabled` | `true` / `false` | runs `scripts/martech/<module>.js` in that tab's phase (vendors that need code) |
| `<module>.<setting>` | | that module's settings |

### Permissions (DA org config)

Martech admins write, other authors read, on `/<site>/configs/site-config.json` (non-HTML files
need the exact path with `.json`; per identity the longest rule wins, so every other author needs
the read row), or a folder rule `/<site>/configs/+**`.

### Add a site or environment

Create its DA site, add `/configs/site-config` with the three tabs and the rows of the vendors it
uses, add the permission rows, Preview and Publish. No code change.

With the planned repoless setup (USTAFoundation.com and USTA.com sharing this repo), each site
keeps its own DA content source and therefore its own `/configs/site-config` sheet, so vendors
and consent settings stay independent per site.

## 2. How it loads

`scripts.js` calls `runPhase(<phase>)` from the page-load phases. For the phase's tab, the loader:

1. reads `consentRequired` (`isConsentRequired()`) if the tab lists anything;
2. injects every `script.<name>` URL (https only; skipped if the page already has that script),
   waiting for consent when it is required — without holding the phase;
3. runs every module with `<module>.enabled=true`: imports `scripts/martech/<module>.js` and calls
   its default export with its settings and `ctx`.

Only modules listed in `MODULES` in `scripts/martech/loader.js` are ever imported — add the name
there when adding a module. So `script.launch` (no module) is injected directly without a lookup
request, and an unknown `<name>.enabled` row only gives an `unknown module` warning.
A module for a `script.<name>` row gets `{ url }` (plus any `<name>.*` rows) and loads the
script itself with `ctx.injectScript(url)`.

| `ctx` field | Meaning |
|---|---|
| `consentRequired` | the resolved `consentRequired` value |
| `whenConsented()` | resolves once the visitor has consented; never resolves otherwise |
| `injectScript(url)` | injects a script once (skipped if the page already has it) |
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
| `window._hjSettings`, `window.hj` | `scripts/martech/hotjar.js`, from the `script.hotjar` URL | Hotjar's script |

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

One row, the Hotjar script URL with the site ID and snippet version in it:

| Tab | Key | Value |
|---|---|---|
| delayed | `script.hotjar` | `https://static.hotjar.com/c/hotjar-<site id>.js?sv=<version>` (ustafoundation: `https://static.hotjar.com/c/hotjar-6402139.js?sv=6`) |

- Hotjar's script needs the snippet's page globals before it runs — without them it stops with
  `_hjSettings is not defined`. So `script.hotjar` is handled by the module
  `scripts/martech/hotjar.js`: it reads the site ID and version from the URL, sets
  `window._hjSettings = { hjid, hjsv }` and the `hj()` queue, then injects the script. A URL in any
  other form is rejected with a warning.
- **When:** the delayed phase; after consent when `consentRequired` is `true`.
- **Once:** skipped when Hotjar is already on the page (`window.hj` and `window._hjSettings` set,
  e.g. by a Tags rule), or the same script is already there. USTA's interim production Tags library
  still has a Hotjar rule — remove it (or leave `script.hotjar` out of the production config) so
  Hotjar is not loaded twice.
- **Kill switch:** remove or blank `script.hotjar`.
- **Testing:** Hotjar starts only over HTTPS and ignores headless browsers ("suspicious
  userAgent") — test on a branch preview with a normal browser user agent.

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
