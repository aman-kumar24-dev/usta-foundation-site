# PRD — USTA Foundation martech, site settings and DA tooling (`aem-coder-branch`)

Last updated: 2026-10-19 · Owner: Aman Kumar (Code and Theory) · Branch `aem-coder-branch`
(rebased onto `develop` `aacbdb5` on 2026-10-07; PR not opened).

> **Scope of this document:** the work done on `aem-coder-branch`, as built. `develop` has since
> been force-updated and carries its own project-wide `docs/PRD.md`, `docs/flow.md`,
> `docs/decision.md` and a **re-architected** martech layer that ports parts of this branch
> (see §13 and Design.md §13). Read this PRD for *what this branch does and why*; read develop's
> docs for the platform-wide plan.

## 1. Summary

`www.ustafoundation.com` (AEM Sites) is being migrated to **AEM Edge Delivery Services (EDS)**,
authored in **Document Authoring (DA, da.live)**. Blocks and content were migrated first. This
branch adds the marketing technology and the tooling around it:

- **Adobe Analytics** through Adobe Experience Platform **Tags (Launch)** + the Analytics extension;
- **Adobe Target** through **at.js in site code** (aem.live pattern), flicker-free, with **A4T**;
- **Hotjar** and **Fundraise Up** (donations) with **donation analytics**;
- an admin-editable DA sheet **`/site-config`** that holds every setting (no values in code,
  **repoless-ready**);
- a **DA content sync** from `aemdemos/foundation-usta` (incl. the **DA Library**), **DA
  permission** rules for the sheet, a **martech test kit**, and these hand-over documents.

## 2. Background and problem

- The old site loads one Launch library from `<head>` that contains Analytics, ECID, Target and a
  Hotjar rule. Copying that into EDS would cost ~3.5 s of main-thread time on throttled mobile and
  break the EDS rule that `head.html` is untouchable.
- Target inside Launch fires late (~3 s, delayed phase) → visible flicker; Target must move into
  site code and run before the first paint on the pages that need it.
- Two more (unknown) sites will share this code (**repoless**). Consent is not required on
  ustafoundation.com but may be on the others. Settings therefore cannot live in code.
- Fundraise Up's widget and its cookies hurt Lighthouse when loaded at page load.
- Content keeps changing in a separate DA org (`aemdemos`), and DA's copy API is same-org only.

## 3. Goals and non-goals

**Goals**
1. Analytics parity with the old site using Tags + the Analytics extension (no Web SDK).
2. Target out of Tags, into site code, no flicker, A4T reporting.
3. Hotjar and Fundraise Up working, donation events tracked.
4. Every martech setting editable by admins in DA without a deploy; one code base for many sites.
5. Keep performance high (LCP, Lighthouse) and content in sync with `aemdemos`.
6. A team member or AI agent can continue the work from the docs alone.

**Non-goals**
- Block/content migration (done before; `MIGRATION.md`).
- Adobe Web SDK (alloy.js) migration — possible later.
- A consent banner / OneTrust integration (keys exist in the sheet; not wired).
- Regional mboxes for Target's Form-Based Composer.
- Changing USTA's Launch properties (that is the Launch admin's work; see open items).

## 4. Users and stakeholders

| Who | Needs |
|---|---|
| Site visitors | fast pages, no flicker, consent respected where required |
| Content authors (DA) | edit pages; set `Target` metadata on pages with activities; cannot break martech |
| Martech admins (aman.kumar@, vishal.sharma@) | edit `/site-config`, preview, publish |
| USTA Launch / Analytics / Target admins | an Analytics-only library, processing rules, activities on EDS selectors |
| Developers / AI agents | clear architecture, runbooks, tests, history |
| Future repoless sites | their own sheet and permissions, no code change |

## 5. Accounts and IDs (public by design, not secrets)

| | USTA (client, production) | Test setup (Code and Theory) |
|---|---|---|
| Adobe IMS org | `A6D83F7A5347FCE90A490D44@AdobeOrg` | `6ED976C95CFFA6810A495C73@AdobeOrg` |
| Tags (Launch) | company `15c795eb812c`, property "USTA Foundation" (`PR5c573c837d974d7ab833f62e00856bf6`), embed `…/15c795eb812c/e99b4446eb17/launch-b4bd8f30c678.min.js` — contains **Analytics + ECID + Target + Hotjar rule**; no `-development`/`-staging` embed exists | property "EDS Migration - Main Site", embed `…/d2309d5b8372/803d3f83f30f/launch-4968d77b0478-development.min.js` — Analytics + Core only |
| Analytics | report suites `usta.global` (prod), `usta.ustacomdev` (dev/stage); tracking server `ustaglobal.112.2o7.net` | `fgeo1xxpspnwustafoundation-site-dev` |
| Target client code | `unitedstatestennisas` | `codeandtheoryamerpar` |
| Target server domain | `unitedstatestennisas.tt.omtrdc.net` | `codeandtheoryamerpar.tt.omtrdc.net` |
| Target settings (from Launch) | at.js 2.11.7 in Launch, global mbox `target-global-mbox`, timeout 3000 ms | site code: at.js 2.11.4, same mbox and timeout |
| Hotjar | site id `6402139`, snippet version 6 | same id |
| Fundraise Up | account `AURLRFGR` | — |
| GitHub | `aman-kumar24-dev/usta-foundation-site` | |
| DA | content `aman-kumar24-dev/usta-foundation-site`, mirrored from `aemdemos/foundation-usta` | |

A4T needs Target and Analytics **in the same Adobe org** — true for USTA, not for the test pair
(test Target org ≠ test Analytics org, so A4T on preview is only partly verifiable).

## 6. Functional requirements

Status: ✅ done and verified · 🟡 built, partly verified · ⏳ pending (owner outside code) · ⬜ not started.

| ID | Requirement | Acceptance criteria | Status |
|---|---|---|---|
| FR-1 | Load the Tags library for the current environment, once, async, in the **delayed phase** (3 s) | one embed per page; one page view; not in standard Lighthouse runs; nothing loads if the URL is missing/invalid | ✅ |
| FR-2 | All martech settings come from the DA sheet `/site-config`; **no code defaults**; environment-specific keys (`key.production`, `key.development`) | sheet missing → no Tags/Target/Hotjar, no errors; invalid value → ignored with one `[site-config]` warning | ✅ |
| FR-3 | Environment derived from the host (localhost / `*.aem.page` / branch `*.aem.live` = development; `main--*.aem.live` and customer domains = production) | rules in Design §3 hold for every host in the test list | ✅ |
| FR-4 | Only martech admins can change `/site-config`; other authors can read it | DA org-config rules; others get read-only | ✅ (emails; groups ⏳) |
| FR-5 | Per-site **consent** switch (`consentRequired`): when true, Tags wait for consent and site at.js is **skipped** (it would set cookies before a CMP answers) | verified with sheet variants | ✅ (no CMP yet) |
| FR-6 | **Fundraise Up** loads only on deliberate interaction (pointerdown, keydown, touchstart, wheel, scroll), immediately with `?form=`, eagerly in the `donate-embed` block; donate links stay on the current site | no widget before interaction; DONATE opens the overlay in the same tab | ✅ |
| FR-7 | **Donation analytics** from code: `checkoutOpen` and `donationComplete` → Analytics link hits configured in the sheet's `donate-beacons` tab | beacon names/events/variables follow the sheet | ✅ |
| FR-8 | **Target** via at.js in site code, only on pages with `Target` metadata **and** `target.enabled=true`; never together with a Launch library that contains Target | no at.js on other pages; one delivery call per Target page | ✅ on preview (test account) |
| FR-9 | **Flicker-free**: the first section waits for page-load offers, capped by `target.flickerTimeout` | simulated offer visible in the first painted frame; slow offer paints at the cap | ✅ |
| FR-10 | **A4T** selectable: `client` (no VisitorAPI), `true`/`server` (VisitorAPI, `sdid`), `false` | client: payload on the page view or one fallback hit; server: `mid`+`sdid` | 🟡 simulated; no live activity |
| FR-11 | **Hotjar** from the sheet only, once | one Hotjar script; none without the sheet | ✅ |
| FR-12 | **DA content sync** `aemdemos/foundation-usta → aman-kumar24-dev/usta-foundation-site` on request: backup first, mirror (never delete), include `/.da/library` (links rewritten), bulk preview | `npm run da:sync` (+ `--dry-run`, `--folders`) | ✅ (new source changes pending, OI-18) |
| FR-13 | DA Library usable in the destination | `verify-library.mjs`: 19 entries, 0 missing, 0 pointing at source | ✅ |
| FR-14 | Repeatable **test kit** for all of the above | `tools/martech-tests/` re-run 2026-10-11 | ✅ |
| FR-15 | **Hand-over docs** readable by people and agents | `.ema/` + pointer in `AGENTS.md` | ✅ |
| FR-16 | Production cutover of Target to the USTA account | `target.*.production` rows set after Launch cleanup | ⏳ OI-2, OI-3, OI-9 |

## 7. Non-functional requirements

| Area | Requirement | Measured / how |
|---|---|---|
| Performance | No martech before LCP except Target on Target pages and the small sheet request | Tags at 3 s keeps BP 96 (75 at 2 s); Fundraise Up on interaction: std mobile perf 67 → 96; Target pages ~+2 s mobile LCP (at.js before paint), offer wait +0.4–0.5 s; VisitorAPI +0.65 s mobile LCP → A4T `client` preferred |
| Requests | One `/site-config.json` request per page | `test-merged.mjs` |
| Privacy | No third-party ID syncs from site code in `client` A4T mode; consent switch per site | ECID syncs (demdex, everesttech, …) only from Launch/VisitorAPI |
| Security | No secrets in code, sheet or docs; Tags URL limited to `https://assets.adobedtm.com/…js`; Target domain `*.tt.omtrdc.net`; Trusted Types respected; no `eval` | validation in `site-config.js`; `test-sheet.mjs` "evil URL" case |
| Accessibility | Project a11y gate passes | `npm run test:a11y` |
| Maintainability | `head.html`, `scripts/aem.js`, `package-lock.json` untouched; new logic in new files; lint clean | `npm run lint` |
| Reversibility | Kill switches in the sheet (blank `launch.*`, `target.enabled=false`) | runbooks in implementation.md |

## 8. Success metrics

- Analytics: page views in the report suite match the old site's per-page `pageName`
  (`foundation:<title>`), campaign (`?cid`) and eVar17/prop17 URL.
- Donations: event9 (checkout open) and event67 + eVar76 (amount) per donation.
- Target: zero flicker reports; one delivery call per Target page; A4T data visible in Analytics.
- Lighthouse (local, median of 3): non-Target pages unchanged by martech; BP ≥ 96.
- Ops: sheet edits go live with Preview/Publish only; a new site needs no code change.

## 9. Dependencies

| Dependency | Owner | Needed for |
|---|---|---|
| Analytics-only USTA Launch library (no Target extension, no "Load Target" rule, no Hotjar rule) | USTA Launch admin | production Target + Hotjar from site code |
| USTA development Launch embed (`usta.ustacomdev`) | USTA Launch admin | preview on USTA's own suites |
| Processing rule for context data `a4t.payload` | Analytics admin | A4T `client` mode reporting |
| `window.targetA4TPayloadSent = true` in the page-view rule | Launch admin | duplicate-hit safety net |
| Live Target activity with Analytics as reporting source | Target admin | end-to-end A4T proof |
| VEC selectors re-pointed to EDS markup | Target admin | existing activities on the new site |
| Page Title metadata equal to the old site | content | `pageName` continuity |

## 10. Decision log

| Date | Decision | Why | By |
|---|---|---|---|
| 09-27 | Analytics via **Tags + Analytics extension** (AppMeasurement), not Edge Network | requested method; keeps the existing Launch/AA setup | user |
| 09-27 | **Interim: reuse USTA's existing Launch library as-is**; Analytics-only library later | fastest path; Target/Hotjar removal is a Launch-side change | user |
| 09-27 | **Repoless, per-site settings**; consent per site | 2 more unknown sites will share the code | user |
| 09-27 | Tags in the **delayed phase**, not in `head.html` | `head.html` untouchable; ~3.5 s main-thread cost of the old library | agent, agreed |
| 09-27 | **Fundraise Up only on deliberate interaction** or `?form=`; **no timer, no pointermove** | cookies/CPU fell inside Lighthouse; synthetic pointermove and an 8 s timer still triggered it | user + agent |
| 09-27 | **Donation analytics sent from code** (`donate` event → beacon) | Launch's rules attach only if the widget exists when Launch runs | user |
| 09-27 | Normalise donate links to `?form=CODE` on the current path, also at click time | authored hrefs point at the live domain | agent |
| 09-27 | **Target via at.js in site code**, only on pages with **`Target` metadata**, behind a flag until Target leaves Launch | performance; two at.js instances conflict | user |
| 09-27 | Keep **VisitorAPI** for server-side A4T (later optional) | A4T as in USTA's Launch (`server_side`) | user |
| 09-28 | **DA content sync** via the agent/CLI (mirror, never delete, backup first, preview) | DA copy API is same-org only; no hosted endpoint wanted | user |
| 09-28 | Settings in an **authored DA sheet** `/site-config` (not the DA config) | admins edit without deploys; DA config is admin-API-only | user |
| 09-28 | `/site-config` **admin-only** via org-config rules | prevent accidental martech changes | user |
| 09-28 | Fetch the sheet **eagerly** (low priority; high on Target pages); Target **waits for offers** before first paint, capped by `target.flickerTimeout` (1000 ms) | flicker-free; the sheet must not wait for the delayed phase | user |
| 09-28 | Site at.js on **preview** with the **test Target account**; A4T off at first | different org than USTA Analytics; VisitorAPI cost | user |
| 09-29 | Copy the **DA Library** (`/.da/library`); sync includes it | Library panel pointed at an empty folder | user |
| 10-01 | Delayed phase back to **3 s** (2 s since `95f6fea`) | at 2 s Tags fell inside standard Lighthouse runs (BP 96 → 75) | user |
| 10-01 | **Client-side A4T** (`target.a4t = client`) via context data `a4t.payload` + one fallback hit | AppMeasurement 2.27.0 drops `s.tnta`; a direct demdex call can't produce a matching `sdid` | user |
| 10-01 | **Keep `VisitorAPI.min.js`** and server mode; new logic in `target-a4t.js` | reversible; isolate new code | user |
| 10-07 | **Rebase onto `develop`**, each conflict reviewed, force-push with lease | develop gained its own site-config + Hotjar | user |
| 10-07 | **One `site-config.js`**: develop's loader/API + our validated layer (`getMartechConfig()`); **no code defaults**; merged environment rules | single source of truth | user |
| 10-07 | **Hotjar only from the sheet** (`hotjar-router.js`) | one owner for Hotjar | user |
| 10-09 | DA permissions guidance: Admin Console groups, site-scoped paths, `/site/CONFIG`, folder rules (e.g. news authors) | scalable, least privilege | guidance only |
| 10-10 | DA Library use cases #1 block catalog, #2 templates, #3 donate picker | DA has its own Library | proposal |
| 10-11 | Hand-over docs in **`.ema/`** + `AGENTS.md` pointer | team and agents continue without the chat | user |
| 10-11 | Test scripts into the repo as **`tools/martech-tests/`** | team can re-run the checks | user |
| 10-16 | USTA production Target values recorded (§5); production rows only after Launch cleanup | avoid two at.js on production | agent, from Launch library |
| 10-19 | Docs restructured as **PRD / Design / flow / implementation**, scoped to this branch; develop's divergence documented, not merged | develop now has its own architecture and docs | user |

## 11. Status (2026-10-19)

| Area | State | Evidence |
|---|---|---|
| Analytics (Tags) | ✅ interim library in prod, test property on preview | `scripts/analytics.js`; branch preview: one page view |
| Fundraise Up + donation beacons | ✅ | `scripts/donate.js`, `analytics.js`; `test-pages.mjs`, `test-sheet.mjs` |
| Target at.js + anti-flicker | ✅ on preview, test account | `test-eager.mjs`; delivery 200 on branch preview |
| A4T client mode | 🟡 simulated; test Launch rule already sends `a4t.payload`; no live activity | `test-a4t.mjs`, `check-client-a4t.mjs` |
| `/site-config` + `site-config.js` | ✅ published (preview = live) | `test-merged.mjs` |
| Hotjar | ✅ from sheet | `hotjar-router.js` |
| DA sync incl. Library | ✅ last mirror 2026-09-28 / Library 09-29; **source changed since** (OI-18) | `tools/da-sync/`, `compare.mjs` |
| DA permissions for `/site-config` | ✅ (emails) | org config rows |
| Test kit | ✅ | `tools/martech-tests/` (`3320018`) |
| Rebase onto develop | ✅ 2026-10-07 — **outdated**: develop force-updated, base `aacbdb5` gone | OI-19 |
| PR | ⬜ not opened | OI-1 |

## 12. Open items

| # | Item | Owner | Notes |
|---|---|---|---|
| 1 | Decide how this branch reaches `develop` (see OI-19) and open the PR with the branch preview link | user | `develop` also lacks `main`'s latest syncs |
| 2 | **Production safety:** the published sheet has `target.enabled=true` + a4t `client` with the **test** account; production Launch still contains **Target and Hotjar** → on production Target pages two at.js would run and Hotjar could load twice | user / Launch admin | set `target.*.production` (or `target.enabled.production=false`) or clean Launch first |
| 3 | Analytics-only USTA Launch library | Launch admin | then only `launch.production` changes |
| 4 | USTA development Launch embed (`usta.ustacomdev`) | Launch admin | |
| 5 | Processing rule for context data `a4t.payload`; confirm it can feed the A4T dimension | Analytics admin | |
| 6 | Add `window.targetA4TPayloadSent = true;` to the test page-view rule | Launch admin | |
| 7 | Live Target activity (reporting source Analytics) on the branch preview | Target admin | |
| 8 | Inventory USTA activities; re-point VEC selectors (Design §7) | Target admin | |
| 9 | Production Target rows: `target.clientCode.production=unitedstatestennisas`, `target.serverDomain.production=unitedstatestennisas.tt.omtrdc.net`, `target.imsOrgId.production=A6D83F7A5347FCE90A490D44@AdobeOrg`, `target.a4t.production` (decide) | user | after OI-2/3 |
| 10 | Title metadata for `who-we-are`, `what-we-do`, `special-funds` (pageName continuity) | content | `our-impact` fixed |
| 11 | Old Launch jQuery rules fail on EDS (nav/button click tracking missing; `linkTrackVars` omits `events`) | Launch admin | rebuild in vanilla JS |
| 12 | Wire OneTrust (`onetrust.sdk`, `onetrust.src`) if consent is needed | team | |
| 13 | DA permissions: Admin Console groups; remove the ignored *site*-config permissions sheet | user | |
| 14 | Pages still load images from `content.da.live/aemdemos/…` | content | |
| 15 | Later: drop `server` A4T + VisitorAPI once `client` is proven; consider Web SDK | team | |
| 17 | Optional Library use cases #1–#3 | team | Design §12 |
| 18 | `aemdemos` changed since the last sync (2026-10-11: 210 newer, 33 new; 238/286 differ) → `npm run da:sync -- --dry-run`, then sync (overwrites destination copies; backup first) | user | on request |
| 19 | **Reconcile with develop's new architecture** (`/configs/site-config` phase tabs, `scripts/martech/` loader, Target ported): decide which of this branch's pieces still go to develop (donation analytics, DA sync tool, test kit, docs) and port them to the new layout instead of rebasing as-is | user | Design §13 |
| 20 | The `settings` tab of `/site-config` has a stray **`script.delay`** row (develop-style; Google Maps script with an API key) — not read by this branch's code. Move it to develop's `/configs/site-config` (`delayed` tab already has `script.googlePlaceLibrary`) or delete it; make sure the Maps key is **HTTP-referrer-restricted** (browser keys are public) | user | do not copy the key into docs |

(OI-16 "copy test scripts into the repo" is closed — `tools/martech-tests/`.)

## 13. Relationship to `develop`

`develop` (tip `d43e142`, 2026-10-19) re-implemented the martech layer as **Martech 1/4–4/4**:
one `/configs/site-config` sheet with `eager` / `lazy` / `delayed` tabs, a loader that injects
`script.<name>` rows and runs `scripts/martech/<module>.js` modules, Target ported from this
branch into `scripts/martech/target.js` (3/4), Fundraise Up still to come (4/4). Environments
become separate DA sites (no host rules in code). Its `docs/MARTECH.md` points to this branch for
the test kit. Mapping and impact: Design §13 and implementation §8.

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Two at.js on production (Launch + site) | broken offers, double requests | OI-2 before any merge to `main` |
| Hotjar loaded twice | double sessions | remove Launch Hotjar rule |
| A4T `client` without processing rule | Target activities without Analytics data | OI-5, OI-7 |
| Rebasing this branch as-is onto the new develop | conflicts and two competing config designs | OI-19: port, don't rebase |
| Sync overwrites destination edits | lost author edits | backup first, `--dry-run`, `--folders` |
| Mobile LCP on Target pages | slower pages | `Target` metadata only where activities run; `client` A4T |

## 15. Next steps

1. OI-2 (production safety) and OI-20 (stray row / key restriction).
2. OI-19: agree with the team how this branch lands on the new `develop`.
3. OI-3/4 with the Launch admin; then OI-9 at cutover.
4. A4T end to end (OI-5–7).
5. OI-18 content sync when wanted; clean-ups (OI-10–17).
