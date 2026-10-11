# Plan — why, what, status

Last updated: 2026-10-11. Branch `aem-coder-branch` (rebased onto `develop` `aacbdb5`); PR not opened yet.

## 1. Context

### Accounts and IDs (public, not secrets)

| | USTA (production) | Test setup (Code and Theory) |
|---|---|---|
| Adobe IMS org | `A6D83F7A5347FCE90A490D44@AdobeOrg` | `6ED976C95CFFA6810A495C73@AdobeOrg` |
| Tags (Launch) | company `15c795eb812c`, property "USTA Foundation" (`PR5c573c837d974d7ab833f62e00856bf6`), embed `…/15c795eb812c/e99b4446eb17/launch-b4bd8f30c678.min.js` (production env; contains **Analytics + ECID + Target + Hotjar rule**) | property "EDS Migration - Main Site", embed `…/d2309d5b8372/803d3f83f30f/launch-4968d77b0478-development.min.js` (Analytics + Core only; **no Target, no ECID**) |
| Analytics report suites | `usta.global` (prod), `usta.ustacomdev` (dev/stage); tracking server `ustaglobal.112.2o7.net` | `fgeo1xxpspnwustafoundation-site-dev` |
| Target | client `unitedstatestennisas`, edge `unitedstatestennisas.tt.omtrdc.net` | client `codeandtheoryamerpar`, edge `codeandtheoryamerpar.tt.omtrdc.net` |
| Hotjar | site id `6402139` | (same id in the sheet) |
| Fundraise Up | account `AURLRFGR` | — |

USTA's Launch embed has **no** `-development` / `-staging` variant under the same name (both
404), so there is no USTA dev library URL yet.

### Code, content, environments

- **GitHub** `aman-kumar24-dev/usta-foundation-site`: `main` = production (tip `dd654a3`
  "Latest code Sync on 7-oct-2026 (#8)", **not yet in `develop`**), `develop` = integration
  (tip `aacbdb5`), `aem-coder-branch` = this work (14 commits on top of `develop`).
- **DA**: content `aman-kumar24-dev/usta-foundation-site`, mirrored from
  `aemdemos/foundation-usta` with `npm run da:sync`.
- **Hosts → environment** (see design.md §2): localhost, `*.aem.page`, branch `*.aem.live` =
  development; `main--*.aem.live` and customer domains = production.

## 2. Goals and scope

- Migrate **Adobe Analytics** to the new site using **Tags + the Adobe Analytics extension**
  (no Edge Network / Web SDK).
- Move **Adobe Target** out of Tags into site code (aem.live at.js pattern), flicker-free,
  with **A4T**.
- Load **Hotjar** and keep **Fundraise Up** donation analytics working.
- Make all martech settings **admin-editable** in DA (`/site-config` sheet), and make the code
  **repoless-ready** (no site values in code).
- Keep **performance** high (LCP / Lighthouse) and **content** in sync with `aemdemos`.
- Out of scope: block/content migration (done earlier — `MIGRATION.md`), Web SDK migration
  (possible future), consent banner implementation (OneTrust keys were added to the sheet by the
  team; not wired yet).

## 3. Decision log

| Date | Decision | Why | By |
|---|---|---|---|
| 09-27 | Analytics via **Tags + Analytics extension** (AppMeasurement), not Edge Network | requested method; keeps the existing Launch/AA setup | user |
| 09-27 | **Interim: reuse USTA's existing Launch library as-is**; plan an Analytics-only library later | fastest path; Target/Hotjar removal is a Launch-side change | user |
| 09-27 | **Repoless, per-site settings**; consent per site (ustafoundation: none; other sites may need it) | 2 more unknown sites will share the code | user |
| 09-27 | Load Tags in the **delayed phase**, not in `head.html` | `head.html` is untouchable (project rule); keeps LCP/TBT clean (~3.5 s main-thread cost of the old library on throttled mobile) | agent, agreed |
| 09-27 | **Fundraise Up only on deliberate interaction** (pointerdown/keydown/touchstart/wheel/scroll), or immediately with `?form=`; **no timer, no pointermove** | its third-party cookies and CPU fell inside Lighthouse; synthetic pointermove and an 8 s timer still triggered it | user + agent |
| 09-27 | **Donation analytics sent from code** (`donate` event → beacon) instead of depending on Launch load order | Fundraise Up loads late now; Launch's rules attach only if the widget exists | user |
| 09-27 | Normalise donate links (`?form=CODE` on the current path) at click time too | authored hrefs point at the live domain; early clicks would leave the site | agent |
| 09-27 | **Target via at.js in site code** (aem.live "at.js legacy" pattern), only on pages with **`Target` metadata**, behind a flag until Target is removed from Launch | perf on other pages; two at.js instances conflict | user |
| 09-27 | Keep **VisitorAPI** for server-side A4T (later made optional) | A4T as in USTA's Launch (`analyticsLogging: server_side`) | user |
| 09-28 | **DA content sync** `aemdemos/foundation-usta → aman-kumar24-dev/usta-foundation-site` ("mirror everything", never delete, backup first, preview) triggered by asking the agent | DA copy API is same-org only; no hosted endpoint wanted | user |
| 09-28 | Martech settings in an **authored DA sheet** `/site-config` (not the DA config, which is admin-API-only and holds permissions) | admins edit without deploys | user |
| 09-28 | `/site-config` **admin-only** (write: aman.kumar@, vishal.sharma@; read: other authors) via **org config** rules | prevent accidental martech changes | user |
| 09-28 | Fetch the sheet **eagerly** (low priority; high on Target pages); Target **waits for offers** before first paint, capped by `target.flickerTimeout` (1000 ms) | flicker-free Target; sheet must not wait for the delayed phase | user |
| 09-28 | Enable site at.js on **preview** with the **test Target account**; **A4T off** for it | different org than USTA Analytics; VisitorAPI cost −0.65 s mobile LCP | user |
| 09-29 | Copy the **DA Library** (`/.da/library`) from aemdemos; sync includes it from now on | Library panel pointed at an empty folder | user |
| 10-01 | Delayed phase back to **3 s** (was 2 s since `95f6fea`) | at 2 s Tags fell inside standard Lighthouse runs (BP 96 → 75) | user |
| 10-01 | **Client-side A4T** (`target.a4t = client`): no VisitorAPI; payload → `window.targetA4TPayload` → Launch page view **context data `a4t.payload`** → processing rule; one backup link hit | AppMeasurement 2.27.0 drops `s.tnta`; a direct demdex call can't produce a matching `sdid` | user |
| 10-01 | **Keep `VisitorAPI.min.js`** and the server mode for now; new logic in a separate file (`target-a4t.js`) | reversible; isolate new code | user |
| 10-07 | **Rebase onto `develop`** (force-push with lease), each conflict reviewed | develop gained its own site-config + Hotjar | user |
| 10-07 | **One `site-config.js`**: develop's loader/API + our validated martech layer (`getMartechConfig()`); **no code defaults** (sheet only); **merged environment rules** (branch `*.aem.live` = development) | single source of truth; no hidden values in code | user |
| 10-07 | **Hotjar only from the sheet** (develop's `hotjar-router.js`); remove the Hotjar rule from USTA's Launch later | one owner for Hotjar | user |
| 10-09 | DA permissions: use **Admin Console groups** (`<org>/<group>`), site-scoped paths, `/site/CONFIG` for site admins; folder rules for sections (e.g. news authors) | scalable, least privilege | guidance only, not applied |
| 10-10 | Sidekick/DA Library: recommended use cases #1 block catalog, #2 templates, #3 donate picker | DA has its own Library; same ideas apply | proposal, not started |

## 4. Status

| Area | State | Evidence |
|---|---|---|
| Analytics (Tags) on the new site | **Done** (interim library) | `scripts/analytics.js`; page view `pageName=foundation:<title>`, eVar17/prop17, campaign verified |
| Fundraise Up on interaction + donation beacons | **Done** | `scripts/donate.js`, `analytics.js`; tests in implementation.md §5 |
| Target at.js + anti-flicker | **Done**, enabled on preview with the **test** account | first paint shows the offer (simulated); delivery 200 on branch preview |
| A4T client mode | **Built and tested with simulated responses**; test Launch rule sends `a4t.payload`; **no live A4T activity yet** | `scripts/target-a4t.js` |
| `/site-config` sheet + merged module | **Done**; sheet **published** (preview = live, target.enabled=true, a4t=client) | `scripts/site-config.js` |
| Hotjar from sheet | **Done** (develop's code) | `scripts/hotjar-router.js` |
| DA content sync incl. Library | **Done**; last full mirror 2026-09-28 (234 files), Library 2026-09-29 (24 files) | `tools/da-sync/` |
| DA permissions for `/site-config` | **Done** (emails, org config) | org config rows on `/usta-foundation-site/site-config.json` |
| Rebase onto develop | **Done** 2026-10-07, pushed `d0e81e2` | backup tag `pre-rebase-20261007` (local) |
| PR | **Not opened** | target branch to be decided |

## 5. Open items

| # | Item | Owner | Notes |
|---|---|---|---|
| 1 | Decide PR target (`develop` assumed) and open the PR; include the branch preview link (AGENTS.md rule) | user | `develop` also lacks `main`'s `dd654a3` sync — reconcile before release |
| 2 | **Before this code reaches `main`**: the **published** sheet has `target.enabled=true` + a4t `client` with the **test** account, and production Launch still contains **Target and Hotjar** → on production Target pages two at.js would run and Hotjar could load twice | user / Launch admin | set the production keys (`*.production`) or remove Target + Hotjar rule from USTA Launch first |
| 3 | Build an **Analytics-only** USTA Launch library (remove Adobe Target extension, "Load Target" rule, Hotjar rule) | Launch admin | then only the sheet's `launch.production` URL changes (same embed URL if republished) |
| 4 | USTA **development** Launch embed (report suite `usta.ustacomdev`) | Launch admin | today preview uses the test org's Launch |
| 5 | Processing rule in the test report suite for context data **`a4t.payload`**; confirm it can populate the A4T dimension | Analytics admin | otherwise only a prop/eVar gets it |
| 6 | Add `window.targetA4TPayloadSent = true;` to the test Launch "Global Page View." rule | Launch admin | safety net against a duplicate backup hit if a beacon is POSTed |
| 7 | A **live Target activity** (reporting source Analytics) on the branch preview to verify A4T end to end | Target admin | |
| 8 | Inventory live USTA Target activities; re-point VEC selectors (old AEM classes → EDS, see design.md §5) | Target admin | Form-Based Composer would need regional mboxes (not built) |
| 9 | Production Target settings at cutover: `target.*.production` = USTA (`unitedstatestennisas`, `A6D83F7A…@AdobeOrg`) and an A4T mode matching the production report suite | user | |
| 10 | Title metadata for `who-we-are`, `what-we-do`, `our-impact`, `special-funds` (pageName continuity with the old site) | content | `our-impact` fixed by the content sync; re-check the others |
| 11 | Old Launch jQuery rules ("DIG-4755 links", "iframe buttons") fail on EDS → nav/button click tracking missing; also their `linkTrackVars` omits `events` | Launch admin | rebuild in vanilla JS in the new library |
| 12 | Wire the **OneTrust** keys (`onetrust.sdk`, `onetrust.src`) into `consent-check.js` if consent is needed | team | keys exist in the sheet, no code yet |
| 13 | DA permissions: Admin Console groups; move/delete the **ignored** permissions sheet in the *site* config (naveen.kambam@ has no page access) | user | design.md §9 |
| 14 | Images in many pages still load from `content.da.live/aemdemos/…` | content | restricted DA users may see broken images in the editor |
| 15 | Later: remove `true/server` A4T mode + `VisitorAPI.min.js` once `client` is proven; consider **Web SDK** long term | team | |
| 16 | Optional: copy the reusable test scripts from `migration-work/` (git-ignored) into the repo (e.g. `tools/martech-tests/`) | team | see implementation.md §5 |
| 17 | Optional: Library use cases #1–#3 (block metadata, templates, donate picker) | team | design.md §10 |

## 6. Next steps (suggested order)

1. Resolve open item 2 (production safety), then 3 and 4 with the Launch admin.
2. Open the PR (item 1), with the branch preview link and a short test list (implementation.md §5).
3. Verify A4T end to end (items 5–7).
4. Plan the Target cutover for production (items 8–9).
5. Clean-ups (items 10–17).
