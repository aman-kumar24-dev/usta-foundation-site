# Design — how it works

Detail reference for martech: `docs/MARTECH.md`. This file is the architecture overview.

## 1. Page-load timeline

```
navigation
│
├─ EAGER (scripts.js loadEager)
│   ├─ fetch('/site-config.json')  → window.hlx.siteConfigFetch   (ONE request per page;
│   │                                 priority 'high' on Target pages, else 'low')
│   ├─ import('./site-config.js')  → reuses that request (consent, Hotjar, Analytics, Target)
│   ├─ decorateMain(main)
│   ├─ [only if page metadata `Target` is set and sheet target.enabled = true]
│   │     target.js: preconnect edge, modulepreload at.js
│   │       → (a4t server: VisitorAPI) → at.js → getOffers(pageLoad)
│   │       → wait for offers OR target.flickerTimeout (1000 ms)
│   │       → (a4t client: target-a4t.js stores window.targetA4TPayload)
│   └─ loadSection(first section)  ← offers applied as sections finish decorating
│
├─ LAZY (loadLazy)
│   ├─ donate.js initDonate(): normalise ?form= links (+ click-time fix);
│   │     Fundraise Up loads on first pointerdown/keydown/touchstart/wheel/scroll
│   │     (immediately if the URL has ?form=)
│   ├─ header, sections, footer, lazy styles, fonts
│
└─ DELAYED (setTimeout 3000 ms after lazy)
    ├─ consent-check.js: sheet consentRequired false → consented.js → hotjar-router.js (Hotjar)
    │                     true → consent workflow (placeholder: ?consent=accept)
    └─ analytics.js: getMartechConfig() → inject the Tags embed (async, once)
          → Launch page view s.t() (rule may add contextData['a4t.payload'])
          → donation beacons on `donate` events
```

Also from `develop`: `openLinksInNewTab()` (every link opens in a new tab, except `#`, `mailto:`,
`tel:`, `javascript:` and `?form=` donate links) and section backgrounds from the Library
`options` tab.

## 2. The `/site-config` sheet (single source of settings)

- An ordinary DA **sheet document** `/site-config` in each site's DA repo, served as
  `/site-config.json` after preview/publish. Not the DA *config* (`da.live/config#…`), which is
  admin-API-only and holds permissions.
- Tabs: **`settings`** (`key | value | notes`) and **`donate-beacons`**
  (`event | linkName | events | set | map`).
- **No code defaults**: a key that is missing or invalid is not used; no sheet → no Tags, no
  Target, no Hotjar (consent falls back to its workflow).
- **Environment** (`isProdEnvironment()` / `getEnvironment()`):

  | Host | Env |
  |---|---|
  | `localhost`, `127.0.0.1`, `*.localhost` | development |
  | `*.aem.page`, `*.hlx.page` | development |
  | `main--<site>--<org>.aem.live` / `.hlx.live` | production |
  | other branch `*.aem.live` / `.hlx.live` | development |
  | any other host (customer domains, unknown) | production |

- **Lookup** (`getConfig(key)`): production `key.production` → `key`; development
  `key.development` → `key.production` → `key`. Any key is allowed (Hotjar, OneTrust, …).
- **Validation** (`getMartechConfig()`): Tags URL must be `https://assets.adobedtm.com/…js`;
  booleans; Target client code, `*.tt.omtrdc.net` domain, `…@AdobeOrg`; A4T mode
  `false|true|server|client`; flicker timeout 0–3000. Invalid → console warning
  `[site-config] invalid value for "<key>"` and the key is ignored.
- **Permissions**: write for admins, read for authors (org-config rules on
  `/usta-foundation-site/site-config.json`).

## 3. Analytics (Tags + Analytics extension)

- `analytics.js` (delayed phase) reads `launch` for the current environment and injects the
  embed once (`async`). If the sheet says `consentRequired: true`, it waits for
  `onConsent()` (from `consent-check.js`).
- Today's libraries: production = USTA's interim library (contains Target + Hotjar rule);
  development = test org "EDS Migration - Main Site".
- What USTA's library sends: `pageName = "foundation:" + document.title`, eVar17/prop17 =
  URL, campaign = `?cid`, download links; page view on DOM ready. **Gaps**: its jQuery rules
  ("DIG-4755 links", "iframe buttons") fail (`$` undefined, visible only with
  `_satellite.setDebug(true)`), so nav/button/text click tracking is missing; those rules also
  omit `events` from `linkTrackVars` (event7/event9 never sent, even on the old site).
- `pageName` depends on page titles — keep Title metadata equal to the old site.

## 4. Donation analytics (Fundraise Up)

`donate.js` attaches `FundraiseUp.on('checkoutOpen' | 'donationComplete')` and re-emits a
`donate` window event (also buffered in `window.donateEvents`). `analytics.js` maps it via the
sheet's `donate-beacons` tab to `s.tl(true, 'o', linkName, overrides)` (overrides only — no
variable leakage):

| Event | Beacon |
|---|---|
| `checkoutOpen` | "Fundraise Up Donation Checkout Open": event9, pageName `ustafoundation:fundraiseup:DONATE`, prop/eVar61 = campaign id, prop/eVar62 = campaign name |
| `donationComplete` | "Fundraise Up Donation Complete": event67, eVar76 = amount |

Interim de-duplication: USTA's library still has its own two Fundraise Up rules; they only
attach if the widget existed when the library ran — then site code leaves post-load events to
them. Remove that guard with those rules.

## 5. Target (at.js in site code)

- Pattern: aem.live "Adobe Target at.js (legacy)". at.js **2.11.4** (aem.live build, loadable
  with `import()`), settings carried over from USTA's Launch (`timeout 3000`,
  `globalMboxName target-global-mbox`, server-side decisioning, …) plus aem.live defaults
  (`pageLoadEnabled false`, `bodyHidingEnabled false`, `cookieDomain` = host).
- Runs only on pages with **`Target` metadata** (not off/false/no) **and** `target.enabled`.
  Skipped on consent-required sites and if `window.adobe.target` already exists.
- **Anti-flicker**: the first section waits for the page-load offers (max
  `target.flickerTimeout`); offers are applied when sections/blocks finish decorating, so the
  first paint already shows them. Slower than the cap → page renders, offer applies on arrival;
  slower than at.js's 3000 ms timeout → offer dropped.
- Fix vs the aem.live snippet: its `getElementForOffer` is `async`, so its "already applied"
  filter dropped every offer after the first pass; `findTarget()` is synchronous.
- **Cutover rule**: never run site at.js together with a Launch library that contains Target
  (Launch's at.js replaces `window.adobe.target` and fires its own request at ~3 s).
- Only the page-load (global) mbox is requested. **Regional mboxes** (needed for Form-Based
  Composer locations like `hero-banner`) are **not built**. VEC works with EDS selectors:

  | Old site (AEM) | New site (EDS) |
  |---|---|
  | `a.navigation-menu__list-item-link--level-1/2` | `header .nav-sections a` |
  | `button.top-navigation__main-button` (DONATE NOW) | `header a.nav-donate` |
  | `a.top-navigation__logo-image` | `header a.nav-brand-link` |
  | `.cmp-breadcrumb…` | `header .nav-breadcrumb` |
  | hero `h1` / intro | `main .hero` (`main .hero h1`) |
  | stats row | `main .columns.stats` |
  | feature rows | `main .columns.feature` |
  | support cards | `main .cards.support` |
  | `.cmp-button` | `main a.button` |
  | footer social / nav / legal | `footer .footer-social-icons a`, `footer .footer-nav a`, `footer .footer-legal a` |

## 6. A4T (Analytics for Target)

| `target.a4t` | at.js logging | VisitorAPI | Data path |
|---|---|---|---|
| `false` | — | no | none |
| `true` / `server` | `server_side` | yes, before at.js | Target and Analytics share `mid` + `sdid`; Launch's ECID reuses our Visitor instance |
| `client` | `client_side` | **no** | payload below |

Client mode:

```
at.js getOffers() response .execute.pageLoad.analytics.payload.tnta
  → target-a4t.js: window.targetA4TPayload (+ 'target-a4t' event)
  → Launch page-view rule: s.contextData['a4t.payload'] = payload   (+ targetA4TPayloadSent)
  → beacon c.&a4t.&payload=…&.a4t&.c → Analytics processing rule
  fallback: if the first page view went out without it → one s.tl "Target A4T" with the same context data
```

Why not alternatives: AppMeasurement 2.27.0 **drops `s.tnta`**; `s.tnt` is the legacy T&T
format; `pe` is overwritten by `s.tl`; calling `dpm.demdex.net/id` yourself gives a `mid` but
no `sdid` that matches Launch's AppMeasurement. **A4T needs Target and Analytics in the same
Adobe org.** Measured: `client` ≈ no cost; `server` ≈ +1 s mobile LCP and third-party ID-sync
cookies.

## 7. Hotjar

`hotjar-router.js` (from `develop`) runs via `consent-check.js` → `consented.js`, reads
`hotjarId`, `hotjarHostUrl`, `hotjarVersion` from the sheet (env-specific keys), injects the
Hotjar script once. A missing sheet → no Hotjar. USTA's production Launch still has its own
Hotjar rule → remove it before this code reaches production.

## 8. Fundraise Up

- Authored donate links point at the live domain (`https://www.ustafoundation.com/…?form=CODE`);
  `donate.js` rewrites them to `<current path>?form=CODE` (and again in a capture-phase click
  handler) so the overlay opens on our site.
- Widget loads on first deliberate interaction, or immediately with `?form=`; the
  `donate-embed` block loads it eagerly. Trusted Types: a pass-through `default` policy is
  installed in the widget's iframe realms (`hardenFrameAccessors`).

## 9. DA: content sync, Library, permissions

- **Content sync** (`tools/da-sync`): DA's copy API is same-org only, so the tool lists the
  source (plus hidden `/.da/library`), backs up the destination, GETs/POSTs every file (mirror,
  never deletes), rewrites `/<source>/` → `/<destination>/` inside the Library `.json` sheets,
  then bulk-previews the copied pages.
- **Library**: site config `library` tab → `/.da/library/blocks.json` (`data` + `options` tabs)
  and `/.da/library/templates.json`; block/template docs under `/.da/library/blocks|templates/`.
  `develop` adds a `library-metadata` block for variant labels.
- **Permissions** (org config `permissions` tab only — a *site* config's permissions sheet is
  ignored):
  - path patterns: `/<site>/+**` (folder + contents), `/<site>/**`, page paths without `.html`,
    non-HTML files with extension (`…/site-config.json`), `CONFIG` (org config incl.
    permissions), `/<site>/CONFIG` (site config only);
  - actions `read`, `write` (incl. delete), empty = none; per identity the **longest path
    wins**, then the most permissive across identities;
  - folders are listable if the user has rights on a descendant; only entries on the way to
    permitted paths are shown (e.g. a "news authors" group with only
    `/usta-foundation-site/en/home/news/+**` sees `en › home › news` and nothing else);
  - groups: email, `<IMS org>`, `<IMS org>/<Admin Console group>`; users re-login after group
    changes; DA refuses a config without a `CONFIG` write row.

## 10. Proposals not yet built

- DA Library improvements: (1) block catalog with `library-metadata`, (2) more page templates,
  (3) Fundraise Up donate picker plugin; later placeholders, news tags, PDF picker, icons.
  Library previews render in a `srcdoc` iframe — martech code should not run there.
- Regional mboxes for Form-Based Composer.
- Web SDK (alloy.js) to replace at.js + VisitorAPI + AppMeasurement.

## 11. Performance and privacy notes

- Measured on localhost (Lighthouse 12, median of 3, interleaved variants because the shared
  host is noisy): Tags at 3 s stays out of standard runs (BP 96 vs 75 at 2 s); Fundraise Up on
  interaction took std mobile 67 → 96; Target pages cost ~+2 s mobile LCP (at.js before first
  paint), the offers wait adds ~0.4–0.5 s; VisitorAPI adds ~0.65 s mobile.
- Third-party cookies (demdex, everesttech, doubleclick, crwdcntrl) come from ECID ID syncs
  inside Launch / VisitorAPI. Own-host `SameSite=None` cookies (Hotjar, Fundraise Up) are only
  flagged when the page is framed cross-site (e.g. a preview panel).
- No secrets in code or sheet; Tags URLs are restricted to `assets.adobedtm.com`.
