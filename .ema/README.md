# `.ema/` — project hand-over (read me first)

This folder lets a teammate **or their AI agent** pick up the USTA Foundation martech and
DA tooling work without re-reading the chat history it came from. It is committed with the
code; the site never serves it (`.hlxignore` ignores dot-folders and `*.md`).

## Read order

1. **[plan.md](plan.md)** — why and what: context, accounts and IDs, every decision (with the
   reason), current status, open items with owners, next steps.
2. **[design.md](design.md)** — how it works: page-load phases, the `/site-config` sheet,
   Analytics, Target + A4T, Hotjar, Fundraise Up, DA content sync, DA Library, DA permissions.
3. **[implementation.md](implementation.md)** — where and how: file map, sheet keys, APIs and
   events, runbooks, testing, gotchas, history.

## The project in one paragraph

`www.ustafoundation.com` (AEM Sites) is being migrated to **AEM Edge Delivery Services**,
authored in **Document Authoring (DA, da.live)**. The blocks and content were migrated first
(see `MIGRATION.md`). This hand-over covers the work that followed: **Adobe Analytics via Adobe
Experience Platform Tags (Launch)**, **Adobe Target via at.js in site code** (anti-flicker,
A4T), **Hotjar**, **Fundraise Up donation analytics**, an admin-editable **`/site-config`
sheet** that drives all of it, a **cross-org DA content sync**, the **DA Library**, **DA
permissions**, and the rebase onto `develop`. The codebase is meant to be shared by more sites
later (**repoless**), so everything site-specific lives in the sheet, not in code.

## Where things are

| What | Where |
|---|---|
| Code | GitHub `aman-kumar24-dev/usta-foundation-site` — branches `main` (production), `develop` (integration), `aem-coder-branch` (this work, rebased onto `develop`) |
| Branch preview | https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page/ |
| Main preview / live | https://main--usta-foundation-site--aman-kumar24-dev.aem.page/ · https://main--usta-foundation-site--aman-kumar24-dev.aem.live/ |
| Source site | https://www.ustafoundation.com/en/home.html |
| DA content | `da.live/#/aman-kumar24-dev/usta-foundation-site` (synced from `aemdemos/foundation-usta`) |
| Settings sheet | `da.live/sheet#/aman-kumar24-dev/usta-foundation-site/site-config` → served as `/site-config.json` |
| DA config | org: `da.live/config#/aman-kumar24-dev/` (permissions live here) · site: `da.live/config#/aman-kumar24-dev/usta-foundation-site/` (Library) |
| Related docs | `docs/MARTECH.md` (martech detail), `tools/da-sync/README.md`, `MIGRATION.md` (dated log), `AGENTS.md` (project rules) |

## Update protocol (humans and agents)

After **every** task that touches this area:

1. `plan.md` — update **Status** and **Open items**; add a dated row to the **Decision log**
   for any new decision (what, why, who decided).
2. `implementation.md` — update the **file map**, **sheet keys** or **runbooks** if they changed;
   add new **gotchas**.
3. `design.md` — only if the architecture or a flow changed.
4. `MIGRATION.md` — add the dated entry the project rules require (`AGENTS.md`).

Keep facts verifiable: give file paths, sheet keys, commit hashes, URLs. Mark anything not yet
verified as **pending** with an owner. **Never put secrets or tokens in these files** — the
IDs listed here (org IDs, report suites, client codes, embed URLs) are public by design.

## Glossary

| Term | Meaning |
|---|---|
| **Tags / Launch** | Adobe Experience Platform Tags — tag manager; one "embed" script (`assets.adobedtm.com/…/launch-….min.js`) per property/environment |
| **AA / AppMeasurement** | Adobe Analytics and its JS library (2.27.0 here); page view = `s.t()`, link hit = `s.tl()`; beacons go to `…/b/ss/<report suite>/…` |
| **ECID / VisitorAPI** | Experience Cloud ID service (`VisitorAPI.js`, 5.5.0) — visitor ID (`mid`) and supplemental data ID (`sdid`) |
| **Target / at.js** | Adobe Target and its client library (2.11.4 in site code, 2.11.7 inside USTA's Launch) |
| **A4T** | Analytics for Target — Target activity data reported in Analytics. `server` mode stitches by `mid`+`sdid`; `client` mode passes the at.js payload (`tnta`) to Analytics |
| **mbox** | a Target location; `target-global-mbox` = the page-load request |
| **VEC / Form-Based** | Target's Visual Experience Composer (CSS selectors) / Form-Based Composer (locations) |
| **DA** | Document Authoring (da.live) — the CMS; `admin.da.live` is its API |
| **EDS** | Edge Delivery Services — `*.aem.page` (preview), `*.aem.live` (live) |
| **Repoless** | several sites served from one code repo; each site has its own DA content and sheet |
| **Eager / lazy / delayed** | EDS page-load phases: first section (LCP) / rest of page, header, footer / third parties (3 s timer here) |
