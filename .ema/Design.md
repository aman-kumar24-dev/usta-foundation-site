# Design — architecture of `aem-coder-branch`

How the martech, settings and DA tooling on this branch are built and why. Step-by-step
sequences are in [flow.md](flow.md); file-level detail and runbooks in
[implementation.md](implementation.md); vendor detail in `docs/MARTECH.md` (this branch's
version). **Section 13 compares this design with `develop`'s newer architecture.**

## 1. Principles

1. **Lift and shift, but EDS-native** — keep the old site's Analytics/Target behaviour; never
   touch `head.html` / `scripts/aem.js`; use the three load phases.
2. **Nothing before LCP that isn't needed for LCP** — Tags at 3 s, Fundraise Up on interaction;
   Target is the one deliberate exception, only on pages that ask for it.
3. **Settings are content, not code** — one admin-only DA sheet per site; no code defaults;
   invalid values are ignored with a warning (fail closed).
4. **Repoless-ready** — the same code serves several sites; site differences live in each
   site's DA repo.
5. **Reversible** — every vendor has a kill switch in the sheet; new logic lives in new files.

## 2. Component map

```
                         DA (da.live)  aman-kumar24-dev/usta-foundation-site
                         ├─ pages, /.da/library            ◄── tools/da-sync ◄── aemdemos/foundation-usta
                         └─ /site-config (sheet: settings, donate-beacons)  ← admins only (org-config ACL)
                                         │ preview/publish
                                         ▼
  browser ── GET page ─► EDS (aem.page / aem.live) ── /site-config.json
     │
     │  scripts/scripts.js ─┬─ eager:  fetch sheet ─► site-config.js ◄─ every module reads settings here
     │                      │          [Target page] target.js ─► vendor/at.min.js (+ VisitorAPI | target-a4t.js)
     │                      ├─ lazy:   donate.js ─► Fundraise Up widget (on interaction) ─► `donate` events
     │                      └─ delayed (3 s): consent-check.js ─► consented.js ─► hotjar-router.js ─► Hotjar
     │                                         analytics.js ─► Tags embed (Launch) ─► AppMeasurement ─► Analytics
     │                                                       └─ `donate` events ─► s.tl link hits
     ▼
  Adobe Target edge (*.tt.omtrdc.net) · Analytics (/b/ss/) · Hotjar · Fundraise Up
```

## 3. Settings: the `/site-config` sheet

**Where.** An ordinary DA sheet document `/site-config` in each site's DA repo, served as
`/site-config.json` after Preview (aem.page) / Publish (aem.live). Not the DA *config*
(`da.live/config#…`), which is admin-API-only and holds permissions and the Library list.

**Shape.** Two tabs:

| Tab | Columns | Holds |
|---|---|---|
| `settings` | `key \| value \| notes` | Tags URLs, consent, Target, Hotjar, OneTrust (unused) |
| `donate-beacons` | `event \| linkName \| events \| set \| map` | Analytics link hits for Fundraise Up events |

**Environment from the host** (`isProdEnvironment(host)`, `getEnvironment(host)`):

| Host | Env |
|---|---|
| `localhost`, `127.0.0.1`, `*.localhost` | development |
| `*.aem.page`, `*.hlx.page` | development |
| `main--<site>--<org>.aem.live` / `.hlx.live` | production |
| other branch `*.aem.live` / `.hlx.live` | development |
| any other host (customer domains, unknown) | production |

**Lookup** `getConfig(key)`: production `key.production` → `key`; development
`key.development` → `key.production` → `key`; else `''`. So one row serves both environments and
a suffixed row overrides it.

**Two layers in one module** (`scripts/site-config.js`):

| Layer | API | Used by |
|---|---|---|
| raw (from `develop`) | `getConfig`, `getSiteConfig`, `whenSiteConfigReady`, `isProdEnvironment`, `getEnvironment`, `window.ustaSiteConfig` | consent-check, hotjar-router |
| validated martech (this branch) | `getMartechConfig()` → `{ site: { launch, consentRequired, target, donateBeacons }, env }` | analytics, target |

**Validation** (martech layer): `launch` must be `https://assets.adobedtm.com/…js`;
`consentRequired`, `target.enabled` booleans; `target.clientCode` `[\w-]+`;
`target.serverDomain` `*.tt.omtrdc.net`; `target.imsOrgId` `…@AdobeOrg`; `target.a4t`
`client | server | true | false`; `target.flickerTimeout` 0–3000. Invalid → one
`[site-config] invalid value for "<key>" — ignored`. Target enabled but missing an account ID →
Target disabled with a warning. Unknown keys are allowed silently (Hotjar, OneTrust, …).

**One request.** `scripts.js` starts `fetch('/site-config.json')` at the top of `loadEager`
(`priority: 'high'` on Target pages, else `'low'`) and stores the promise in
`window.hlx.siteConfigFetch`; `site-config.js` reuses it. Missing sheet → `whenSiteConfigReady()`
rejects → no Tags, no Target, no Hotjar, consent falls back to its workflow.

**Access.** DA org-config `permissions` rows on `/usta-foundation-site/site-config.json`: write
for martech admins, read for named authors (§11).

## 4. Analytics (Tags + Analytics extension)

- `analytics.js` runs in the delayed phase (3 s after lazy). It reads `site.launch[env]` and
  injects the embed **once**, `async` (skipped if `_satellite` or the same script already
  exists). With `consentRequired=true` it waits for `onConsent()`.
- The Tags library does the rest: page view (`s.t()`), its rules, ECID (production library only).
- Libraries today: production = USTA's interim library (Analytics + ECID + Target + Hotjar
  rule); development = the test property (Analytics + Core).
- What USTA's library sends: `pageName = "foundation:" + document.title`, eVar17/prop17 = URL,
  campaign from `?cid`, download links. Gaps on EDS: its jQuery rules ("DIG-4755 links",
  "iframe buttons") fail (`$` undefined), and they omit `events` from `linkTrackVars`.
- Why the delayed phase: the library costs ~3.5 s main thread on throttled mobile; at 2 s it fell
  inside standard Lighthouse runs (Best Practices 96 → 75).

## 5. Donations: Fundraise Up + donation analytics

- **Links.** Authored donate links point at the live domain (`…ustafoundation.com/…?form=CODE`).
  `donate.js` rewrites them to `<current path>?form=CODE` at init and again in a capture-phase
  click handler, so the overlay opens on the current site in the same tab (exempt from
  `develop`'s `openLinksInNewTab()`).
- **Loading.** Widget script on the first `pointerdown`, `keydown`, `touchstart`, `wheel` or
  `scroll`; immediately when the URL has `?form=`; eagerly in the `donate-embed` block. No timer
  and no `pointermove` (Chrome fires synthetic ones under a resting cursor).
- **Trusted Types.** The site enforces Trusted Types; a pass-through `default` policy is installed
  in the widget's iframe realms (`hardenFrameAccessors`).
- **Events.** `donate.js` subscribes to `FundraiseUp.on('checkoutOpen' | 'donationComplete')`,
  buffers them in `window.donateEvents` and dispatches a `donate` window event.
- **Beacons.** `analytics.js` maps each event through the `donate-beacons` tab to
  `tracker.tl(true, 'o', linkName, overrides)` — overrides only, so nothing leaks into later
  hits; queued until the tracker exists (polls 500 ms × 40).

  | Event | Beacon (today's sheet) |
  |---|---|
  | `checkoutOpen` | "Fundraise Up Donation Checkout Open": event9, `pageName=ustafoundation:fundraiseup:DONATE`, prop/eVar61 = campaign id, prop/eVar62 = campaign name |
  | `donationComplete` | "Fundraise Up Donation Complete": event67, eVar76 = amount |

- **Interim de-duplication.** USTA's library has its own two Fundraise Up rules that attach only
  if the widget existed when the library ran (`tags.handlesDonate`); then site code leaves
  post-load events to them. Remove the guard together with those rules.

## 6. Consent and Hotjar

- `consent-check.js` (delayed): sheet `consentRequired` not true → `loadConsented()` →
  `consented.js` → `hotjar-router.js`. True → the consent workflow (placeholder CMP:
  `?consent=accept`), which dispatches `consent.update`; `onConsent(cb)` lets other modules wait.
- On consent-required sites **site at.js is skipped** (it would set cookies before a CMP could
  answer) and Tags wait for consent.
- `hotjar-router.js` reads `hotjarId`, `hotjarVersion`, `hotjarHostUrl` (env-suffixed), injects
  Hotjar once; no sheet → no Hotjar. USTA's production Launch Hotjar rule must go before
  production.

## 7. Target (at.js in site code)

- **Pattern:** aem.live "Adobe Target at.js (legacy)"; at.js **2.11.4** (aem.live build,
  importable) in `scripts/vendor/`.
- **Gate:** page metadata `Target` set (not `off`/`false`/`no`) **and** `target.enabled=true`
  **and** `consentRequired` false **and** no `window.adobe.target` yet (Launch's at.js).
- **Settings** (`window.targetGlobalSettings`): from the sheet — `clientCode`, `serverDomain`,
  `imsOrgId`; aem.live — `bodyHidingEnabled`, `pageLoadEnabled`, `viewsEnabled` false,
  `secureOnly`, `cookieDomain = hostname` (aem.page/aem.live are public suffixes); carried over
  from USTA's Launch — `timeout 3000`, `visitorApiTimeout 2000`, `globalMboxName
  target-global-mbox`, `decisioningMethod server-side`, ID lifetimes; `analyticsLogging` from
  the A4T mode.
- **Offers:** `getOffers({ execute: { pageLoad: {} } })`, then `applyOffers` every time a section
  or block finishes decorating (MutationObserver on `data-section-status` /
  `data-block-status`); applied items are dropped so later passes only apply what is still
  waiting. VEC `:eq(n)` selectors are converted to `:nth-child(n+1 of …)`.
- **Fix vs the aem.live snippet:** its `getElementForOffer` is `async`, so its "already applied"
  filter dropped every offer after the first pass; `findTarget()` here is synchronous.
- **Anti-flicker:** `loadEager` awaits `initTarget()` before `loadSection(first)`; `initTarget`
  resolves when offers are in **or** after `target.flickerTimeout` ms (default 1000; 0 = don't
  wait). Later offers still apply on arrival; after at.js's 3000 ms timeout they are dropped.
- **Cutover rule:** never run site at.js with a Launch library that contains Target.
- **Composer support:** only the global (page-load) mbox. VEC works with EDS selectors; regional
  mboxes for the Form-Based Composer are not built.

  | Old site (AEM) | New site (EDS) |
  |---|---|
  | `a.navigation-menu__list-item-link--level-1/2` | `header .nav-sections a` |
  | `button.top-navigation__main-button` (DONATE NOW) | `header a.nav-donate` |
  | `a.top-navigation__logo-image` | `header a.nav-brand-link` |
  | `.cmp-breadcrumb…` | `header .nav-breadcrumb` |
  | hero `h1` / intro | `main .hero`, `main .hero h1` |
  | stats row / feature rows / support cards | `main .columns.stats` / `main .columns.feature` / `main .cards.support` |
  | `.cmp-button` | `main a.button` |
  | footer social / nav / legal | `footer .footer-social-icons a`, `footer .footer-nav a`, `footer .footer-legal a` |

## 8. A4T (Analytics for Target)

| `target.a4t` | at.js `analyticsLogging` | VisitorAPI | How Analytics gets the data | Cost |
|---|---|---|---|---|
| `false` | (server_side, unused) | no | — | none |
| `true` / `server` | `server_side` | yes, before at.js | Target and Analytics stitch by `mid` + `sdid`; Launch's ECID reuses the Visitor instance | ≈ +1 s mobile LCP, ID-sync cookies |
| `client` | `client_side` | **no** | payload `tnta` → `window.targetA4TPayload` → Tags page-view rule sets `s.contextData['a4t.payload']` → processing rule; fallback: one `s.tl` "Target A4T" hit if the first page view went out without it | ≈ none |

- **Fallback detection** (`target-a4t.js`): a buffered `PerformanceObserver` on resource entries
  finds the first page-view request (`/b/ss/` without `pe=`); if it lacks the payload and
  `window.targetA4TPayloadSent` isn't set, it sends the link hit once.
- **Why not alternatives:** AppMeasurement 2.27.0 drops unknown variables (`s.tnta`); `s.tnt` is
  the legacy T&T format; `pe` is overwritten by `s.tl`; calling `dpm.demdex.net/id` directly
  yields a `mid` but no `sdid` matching Launch's AppMeasurement. A4T needs Target and Analytics in
  the same Adobe org.

## 9. Page-load integration (scripts.js)

| Phase | What this branch adds |
|---|---|
| eager (top of `loadEager`) | sheet fetch + `import('./site-config.js')`; on Target pages `import('./target.js')` and `await` it before the first section |
| lazy (top of `loadLazy`) | `import('./donate.js')` → `initDonate()` |
| delayed (`setTimeout(loadDelayed, 3000)`) | `consent-check.js`, `analytics.js` |

From `develop` (kept in the rebase): `openLinksInNewTab()`, `applySectionBackgrounds()`.

## 10. DA content sync and Library

- **Why a tool:** DA's copy API is same-org only (`aemdemos` → `aman-kumar24-dev` is cross-org),
  and no hosted endpoint was wanted.
- **How** (`tools/da-sync`, `npm run da:sync`): list the source recursively plus the hidden
  `/.da/library` (DA listings omit dot-folders) → back up the destination files → GET each source
  file and POST it to the destination (**mirror, never delete**) → rewrite `/<source>/` →
  `/<destination>/` inside `/.da/library/*.json` → bulk preview (dot-folders are never
  previewed). Flags `--dry-run`, `--folders=`, `--no-preview`, `--no-backup`, `--source=`,
  `--destination=`. Auth: injected in AEM Coder, else `DA_TOKEN`.
- **Library:** site-config (DA config) `library` tab → `/.da/library/blocks.json` (`data` +
  `options` tabs) and `templates.json`; documents under `/.da/library/blocks|templates/`.

## 11. DA permissions (model)

- Only the **org config** `permissions` tab counts; a *site* config's permissions sheet is
  ignored.
- Paths: `/<site>/+**` (folder and contents), `/<site>/**`, page paths **without** `.html`,
  non-HTML files **with** extension (`…/site-config.json`), `CONFIG` (org config),
  `/<site>/CONFIG` (that site's config).
- Actions `read`, `write` (incl. delete), empty = none. Per identity the **longest path wins**;
  across identities the most permissive wins.
- Folders are listable when the user has rights on a descendant; only the entries on the way are
  shown (a "news authors" group with `/usta-foundation-site/en/home/news/+**` sees only
  `en › home › news`).
- Identities: email, `<IMS org>`, `<IMS org>/<Admin Console group>`; users log out/in after group
  changes. DA refuses a config without a `CONFIG` write row — keep one (lock-out guard).

## 12. Alternatives considered

| Option | Outcome |
|---|---|
| Launch embed in `head.html` | rejected — untouchable file, LCP/TBT cost |
| Delayed phase at 2 s | reverted to 3 s — Tags inside Lighthouse runs |
| Fundraise Up on a timer / on `pointermove` | rejected — still fired during Lighthouse |
| Target left in Launch | rejected — flicker, late offers |
| `s.tnta` / `s.tnt` for client A4T | rejected — dropped / legacy |
| Own demdex `id` call instead of VisitorAPI | rejected — no matching `sdid` |
| Code defaults for settings | removed on 10-07 — sheet is the only source |
| DA copy API / hosted sync endpoint | not possible cross-org / not wanted |
| Proposals not built | DA Library: block catalog (`library-metadata`), more templates, donate picker; regional mboxes; Web SDK |

## 13. Comparison with `develop` (tip `d43e142`, 2026-10-19)

`develop` was force-updated after this branch's rebase and now implements martech differently
("Martech 1/4–4/4"):

| Topic | This branch | `develop` |
|---|---|---|
| Sheet | `/site-config`, tabs `settings` + `donate-beacons` | `/configs/site-config`, tabs `eager` / `lazy` / `delayed` (one per load phase, fetched `?sheet=<tab>` on demand) |
| Environments | host rules + `.production` / `.development` key suffixes | none in code — each environment is its own DA site with its own sheet |
| Loader | per-vendor modules wired in `scripts.js` | `scripts/martech/loader.js` `runPhase(phase)`: injects `script.<name>` rows; runs `scripts/martech/<module>.js` for `<module>.enabled` (allow-list `MODULES`) |
| Tags | `launch.<env>` row, `analytics.js` | `script.launch` row (delayed tab), plain script tag |
| Hotjar | `hotjarId`/`hotjarVersion`/`hotjarHostUrl` rows, `hotjar-router.js` | `script.hotjar` URL row, `scripts/martech/hotjar.js` |
| Target | `scripts/target.js`, `target-a4t.js`, `scripts/vendor/` | ported from this branch: `scripts/martech/target.js`, `target-a4t.js`, `scripts/martech/vendor/`; first section `visibility: hidden` until offers/cap; with consent required Target loads after consent instead of being skipped |
| Consent | `onConsent()` export, skip Target | `window.hlx.consent` + `consent.update`; modules get `ctx.whenConsented()`; missing `consentRequired` → treated as required |
| Fundraise Up + donation beacons | `donate.js` on interaction + `donate-beacons` tab | Martech 4/4, not yet in develop (widget in the delayed phase) |
| DA sync tool, test kit | `tools/da-sync/`, `tools/martech-tests/` | not in develop; its MARTECH.md points to this branch's test kit |
| Docs | `.ema/` | `docs/PRD.md`, `docs/flow.md`, `docs/decision.md`, `docs/ARCHITECTURE.md`, `docs/MARTECH.md` |

Consequence: rebasing this branch onto the new `develop` would bring back a second config
design. The remaining unique pieces (donation analytics, interaction loading, DA sync, test kit)
should be **ported** to develop's layout (PRD OI-19). The DA content already holds both sheets
(`/site-config` for this branch, `/configs/site-config` for develop).
