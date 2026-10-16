# Decision Log

A running record of decisions taken on this project: what was decided, why, and where the detail lives. It sits next
to [PRD.md](PRD.md) (requirements), [flow.md](flow.md) (how things run) and [MIGRATION.md](../MIGRATION.md) (build log). Questions that are **not yet decided**
live in [PRD.md §12](PRD.md#12-open-questions-need-an-owners-answer); when one is answered, record the decision here as a new `D-xxx` and mark the question
**Answered** in PRD §12 (it keeps its number).

## How to use this log

- **Append** a new entry at the bottom of the index and add its detail block under the matching topic heading in
  *Decision details* (never after the *Superseded or reverted* table). The index *Status* column is live: update it when
  the state changes (e.g. drop `(branch only)`) and add a dated note to the detail block. Never rewrite history: if a decision
  changes, add a new entry and mark the old one `Superseded by D-xxx`. Factual corrections to an entry are added as a
  dated *Correction* note, not by editing the original text.
- Record decisions, not tasks. A decision is a choice between options that someone would otherwise re-open.
- Each entry: **ID**, **date** (YYYY-MM-DD), **decision**, **why**, **decided by**, **source**, **status**
  (`Active` / `Superseded` / `Reverted`).
- Date and *decided by* are copied from the repo where it records them. `n/d` means the repo does not say; fill it in.
  *user* means the person directing the work as recorded in MIGRATION.md or `.ema/plan.md` (the log does not name
  them); *customer* means USTA.
- A status ending in **(branch only)** means the code exists only on an unmerged branch, not on `develop` (see
  [PRD §8.7](PRD.md#87-branches-not-merged-into-develop)).
- Entries D-001 to D-019 were reconstructed from the repo on 2026-10-15. Entries D-020 to D-072 were added the same day
  from a second pass over MIGRATION.md, the git history of `develop`/`main` and the unmerged branches. None has been
  confirmed by its owner. D-073 onward are recorded when the decision is made (AGENTS.md, The Project-Docs Rule).

## Index

| ID | Date | Decision | Status |
|---|---|---|---|
| D-001 | 2026-10-15 | PRD covers the whole platform (Foundation + usta.com) | Active |
| D-002 | 2026-10-15 | PRD is written for developers and agents | Active |
| D-003 | 2026-10-15 | PRD records shipped work as baseline, then remaining work | Active |
| D-004 | 2026-10-15 | PRD marks unknowns `TBD` and lists them as open questions | Active |
| D-005 | 2026-10-15 | Keep a decision log in `decision.md` | Active |
| D-006 | n/d (in force by 2026-08-22) | Lift-and-shift migration: adopt the source site's design system | Active |
| D-007 | 2026-08-22 | Breakpoints `768 / 992 / 1200`, mobile-first, `min-width` only | Active |
| D-008 | 2026-09-23 | Desktop content column: one fluid tier capped at 1170, not a fixed 970 | Active |
| D-009 | n/d | Pixel-first CSS units to match the source | Active |
| D-010 | n/d | No build step, zero runtime dependencies | Active |
| D-011 | n/d | Branching `feature/* → develop → uat → main`, PRs only | Active |
| D-012 | n/d | One repo, two sites (repoless); each site has its own content and martech sheet | Active (shared profile undecided) |
| D-013 | 2026-09-06 | Revert the inline Fundraise Up embed; keep the `?form=` overlay | Superseded (inline part) by D-040 |
| D-014 | 2026-10-07 | Site config merged into one module, with no code defaults | Active (no code defaults); env rules superseded by D-015 |
| D-015 | 2026-10-14 | Martech config: one sheet tab per page-load phase | Active |
| D-016 | 2026-10-08 | Link targets: internal same tab; external and files new tab; `#_blank` override | Active |
| D-017 | 2026-10-10 | Dark CTA authored as bold + superscript (strikethrough dropped) | Active |
| D-018 | 2026-10-09 | Related Articles `max-items` capped at 3 | Active (approval n/d, see PRD §12) |
| D-019 | 2026-09-05 | Import one template at a time; news detail first (84 % of pages) | Active |
| D-020 | 2026-09-03 | Source-only breakpoints are not added as tiers; the remaining drift is accepted | Active |
| D-021 | 2026-09-03 | Third-party embeds: self-contained or consent-gated by default, then switched per embed to the real embed for parity | Active (partly superseded per embed) |
| D-022 | 2026-09-03 | Remove blocks that duplicate another block or only wrap default content | Active |
| D-023 | 2026-09-04 | Each block family is one base block plus variants (`Cards (expand)`, `Hero (banner)` …) | Active |
| D-024 | 2026-09-04 | Band colour and content width/alignment are separate, composable section styles | Active |
| D-025 | 2026-09-04 | Fundraise Up deep links are absolute, path-bearing URLs, rewritten to the current path at runtime | Active |
| D-026 | 2026-09-05 | Below 768, content sits in one fixed, centred column (328, now 336 px) | Active |
| D-027 | 2026-09-06 | A block beside text is a `split-left` / `split-right` grid section, not a float | Active |
| D-028 | 2026-09-06 | Tabs = `toc-profile` block that shows one tagged section at a time; `tabs` block deleted | Active |
| D-029 | 2026-09-06 | `cards (profile)` are equal height per row (deviation: the source cards hug their content) | Active |
| D-030 | 2026-09-06 | Breadcrumb labels come from page metadata + `/query-index.json`; the `news` level is hidden | Active |
| D-031 | 2026-09-07 | The H1/H2 display face is preloaded and declared inline with `font-display: block` | Active |
| D-032 | 2026-09-07 | One H1 size site-wide; templates set H1 colour and margins only | Active |
| D-033 | 2026-09-08 | CSS-only page types use `Theme` metadata (body class), not `Template`; layout keys on structure | Active |
| D-034 | 2026-09-08 | Migrate `/en/home/news` as a metadata-only page (no feed) | Active |
| D-035 | 2026-09-08 | One importer per unique page layout for single landing pages | Active (deviation from the Content-Import Rule; confirm) |
| D-036 | 2026-09-08 | Keep links that are also broken on the source; do not invent new targets | Active |
| D-037 | 2026-09-09 | Every content image is author-managed; no raster images in code | Active |
| D-038 | 2026-09-09 | One repo-root `icons/` folder, resolved through `window.hlx.codeBasePath` | Active |
| D-039 | 2026-09-10 | `loadDelayed()` runs 3 s after the lazy phase; Tags, the consent gate and Fundraise Up load there | Active |
| D-040 | 2026-09-15 | Inline Fundraise Up form via the native embed in a `donate-embed` block; `custom-form-donate` retired | Active |
| D-041 | 2026-09-22 | Related Articles is built by the news template from `/news-index.json`, configured by page metadata | Active |
| D-042 | 2026-09-22 | News `Publication Date` only where the source shows a real date; `News Tags` from the source `data-tags` | Active (importer not updated) |
| D-043 | 2026-09-24 | Brand tokens live in `styles/styles.css` `:root`; no `styles/brand.css`, no CSS `@import` | Active |
| D-044 | 2026-09-27 | Adobe Analytics via the Tags (Launch) embed only, reusing USTA's library for now | Active |
| D-045 | 2026-09-27 | Adobe Target moves out of Tags into site code (at.js), only on pages with `Target` metadata | Active (branch only) |
| D-046 | 2026-09-27 | Fundraise Up loads only on deliberate interaction; donation beacons are sent from code | Active (branch only) |
| D-047 | 2026-09-27 | ustafoundation needs no consent gate (`consentRequired = false`); other sites set their own | Active (confirm before `one-trust` merges) |
| D-048 | 2026-09-28 | Martech settings live in an authored DA sheet per site, not in the DA org/site config | Active |
| D-049 | 2026-09-28 | The martech config sheet is admin-only (DA org permission rows) | Active |
| D-050 | 2026-09-28 | Mirror DA content from `aemdemos/foundation-usta` with a sync tool, on request | Active (tool branch only) |
| D-051 | 2026-09-30 | Remove the Reactions widget from all news pages; retire `custom-widget-reactions` | Active |
| D-052 | 2026-10-01 | Analytics for Target (A4T) in client-side mode, with no VisitorAPI | Active (branch only) |
| D-053 | n/d | Accept named axe exceptions for source parity | Active |
| D-054 | 2026-10-02 | Uneven text + image rows use the `split-5-6` section style; alignment lives in blocks | Active |
| D-055 | 2026-10-02 | Homepage video uses the real YouTube player, mounted 300 px before the viewport | Active |
| D-056 | 2026-10-06 | Related Articles thumbnails use the source's alt and tooltip | Active |
| D-057 | 2026-10-06 | Data layer is `window.dataLayer` (GTM convention), not Adobe Client Data Layer | Active (branch only) |
| D-058 | 2026-10-07 | Below 992, plain `columns` text is centred on every page except news articles | Active |
| D-059 | 2026-10-07 | Default content uses a 24 px heading/paragraph rhythm on every page | Active |
| D-060 | 2026-10-07 | OneTrust without `OtAutoBlock.js`; site code gates each vendor | Active (branch only) |
| D-061 | 2026-10-09 | Fundraise Up widget-card reproductions use the widget's font (IBM Plex Sans) | Active |
| D-062 | 2026-10-11 | USTA buttons cover usta.com's own system only, named by look (`usta-…`), no size option | Active |
| D-063 | 2026-10-11 | The USTA icon list lives only in the DA buttons sheet | Active |
| D-064 | 2026-10-13 | Show image alt text as a hover tooltip site-wide | Active |
| D-065 | 2026-10-14 | Committed docs name roles, never people's e-mail addresses | Active |
| D-066 | 2026-10-14 | Analytics, Hotjar and Target run only when OneTrust groups C0002, C0004 and C0005 are all on | Active (branch only) |
| D-067 | 2026-10-14 | `consentRequired` fails closed: no row, or any value other than `true`/`false`, counts as required | Active |
| D-068 | 2026-10-14 | Each vendor is one `script.<name>` row; a module in `scripts/martech/` only when it needs page setup | Active |
| D-069 | 2026-10-14 | Port martech from `aem-coder-branch` to `develop` in four PRs, one vendor each | Active (1/4, 2/4 done) |
| D-070 | 2026-09-09 | Hero photos stay CSS backgrounds, with a hidden `role=img` label and an LCP preload | Active |
| D-071 | 2026-09-29 | CTA buttons are a separate `a.cta-button` layer on top of the boilerplate buttons | Active |
| D-072 | n/d | `compact-headings` section style: a per-section opt-out of the 24 px rhythm | Active |
| D-073 | 2026-10-16 | Keep the PRD, decision log and flows in `docs/` with the other project docs | Active |
| D-074 | 2026-10-16 | Diagrams in `docs/assets/`; architecture prose in one `docs/ARCHITECTURE.md` | Active |
| D-075 | 2026-10-16 | Agents keep the four project docs current in the same PR as each change | Active |
| D-076 | 2026-10-16 | Codebase switch panel: pick main / uat / develop, Go reloads the canvas with `?ref=<branch>` through the DA SDK | Superseded by D-077 |
| D-077 | 2026-10-16 | Env selector: Go keeps the open page and only sets `?ref=<branch>`; plugin renamed `env-selector` | Active (in PR to `develop`) |
| D-078 | 2026-10-16 | Env selector branches come from the DA sheet `/.da/environments/config` (tab `code`); the HTML list is the fallback | Active (in PR to `develop`) |
| D-079 | 2026-10-16 | Env selector content picker: the hash's site segment is replaced; Go needs both picks and one change | Active (in PR to `develop`); layout and unlisted-value parts superseded by D-080 |
| D-080 | 2026-10-16 | Env selector design from the user's mockup: one row of field cards + round Go, unlisted open values added, "Currently on …" status | Active (in PR to `develop`); row-only layout refined by D-081 |
| D-081 | 2026-10-16 | Env selector: label "CodeBase"; cards stack up to 576 px (panel-only step, outside the site breakpoints) | Active (in PR to `develop`) |
| D-082 | 2026-10-16 | Env selector CodeBase is an editable combobox: typed/pasted branches, host-name form, listed with the sheet's | Active (in PR to `develop`) |

---

## Decision details

### Decisions taken while writing the PRD

**D-001 — PRD scope: whole platform.** The repo is named `usta-com` but MIGRATION.md covers only ustafoundation.com.
Chosen over "Foundation only", "usta.com only" and "a single feature". *Why:* the README's repoless plan already treats
one codebase serving both sites as the target. *Decided by:* user, 2026-10-15. *Source:* PRD §1–2.

**D-002 — PRD audience: dev team and AI agents.** Requirements are precise and tied to the existing rules, skills and
checkers instead of written in business language. *Decided by:* user, 2026-10-15. *Source:* PRD header.

**D-003 — PRD is retrospective + forward.** Shipped work is recorded as baseline requirements with a status, then the
remaining work is spelled out. Chosen over "forward only". *Decided by:* user, 2026-10-15. *Source:* PRD §4, §11.

**D-004 — Unknowns are `TBD`, never invented.** Success metrics, dates, owners and the usta.com page scope are marked
`TBD` and collected in PRD §12. Statuses that came from MIGRATION.md are flagged where later log entries contradict them
(e.g. T1 news detail). *Decided by:* Claude, within the approved plan, 2026-10-15. *Source:* PRD §12.

**D-005 — Decision log lives in `decision.md`.** The file name follows the user's request (the other root docs are
uppercase, e.g. `PRD.md`). *Decided by:* user, 2026-10-15.

**D-073 — Project docs live in `docs/` (2026-10-16).** `PRD.md`, `decision.md` and `flow.md` moved from the repo root
into `docs/`, next to `BRANCHING.md`, `MARTECH.md` and `architecture/`. File names are unchanged (D-005), and links
between them stay relative within `docs/`. `.hlxignore` (`*.md`) keeps them off the sites. *Why:* keep the project docs
in one folder with `BRANCHING.md` and `MARTECH.md`. *Decided by:* user. *Source:* user, 2026-10-16.

**D-074 — Diagrams in `docs/assets/`, architecture in `docs/ARCHITECTURE.md` (2026-10-16).** `docs/architecture/` held only
the four SVG diagrams, so it was renamed `docs/assets/`, and the architecture prose went into one `docs/ARCHITECTURE.md`.
One file rather than an `architecture/` folder, because `docs/` keeps one uppercase file per topic (`BRANCHING.md`,
`MARTECH.md`) and martech and branching already have theirs; split it into a folder if it grows. README, BRANCHING.md
and MARTECH.md embed the diagrams from `assets/`. *Decided by:* user (images vs prose); layout proposed by Claude.

**D-075 — Project docs are kept current with every change (2026-10-16).** AGENTS.md gained *The Project-Docs Rule*:
`docs/PRD.md`, `docs/decision.md`, `docs/flow.md` and `docs/ARCHITECTURE.md` are updated in the same task and PR as the
change, or in the next `feature/*` → `develop` PR for changes that do not come through one (answers, Adobe drops,
promotions). The PR template, `PR_AGENT.md` and the `verify-before-claiming` skill carry the same step; `MIGRATION.md`
stays the dated build log and links to `D-xxx` entries. *Why:* keep the docs true without re-auditing the repo.
*Decided by:* user. *Source:* user, 2026-10-16.

### Decisions already recorded in the repo

**D-006 — Lift-and-shift.** Migrate quickly with visual and functional parity; adopt the source site's breakpoints, grid
and typography rather than designing new ones, and decide each once, up front. *Source:* AGENTS.md (Breakpoint, Grid,
Typography rules).
*Correction (2026-10-15):* the repo does not date the decision itself. Earliest dated uses: breakpoints decided 2026-08-22
(D-007); the Grid, Typography and Migration-Log rules were added in the 2026-08-28 guardrail sync (MIGRATION.md
2026-08-28). Parity means reproducing the source's grid, breakpoints and computed type scale as our own tokens and CSS,
verified by measuring both sites, never by copying its stylesheet (MIGRATION.md 2026-09-03).

**D-007 — Breakpoints 768 / 992 / 1200.** Taken from the source's Bootstrap 3 CSS (min-width hits 296 / 101 / 12);
`991`, `336`, `720`, `1920` and `1370` were excluded as noise or one-offs. Mobile-first, `min-width` only, never mixed
with `max-width`. Fallback if none can be discovered: 600 / 900 / 1200. *Source:* `tools/quality/breakpoints.json`
(`decidedOn` 2026-08-22), enforced by `breakpoint-check.mjs`.

**D-008 — Desktop container is fluid up to 1170.** At ≥ 992 the content width is `min(viewport, 1200) − 30`, clamped
at 1170 from 1200 up, with a 30 px gutter. This replaced a fixed 970 plateau that was about 199 px too narrow at 1199.
Mobile is a fixed 336, tablet 720. *Source:* `tools/quality/breakpoints.json` (`containerNote`, reconciled 2026-09-23).
*Correction (2026-10-15):* *Decided by:* customer spec (<768: 336; tablet 720; desktop outer 1200, content 1170),
reconciled with live measurement. This was step 2 of the reconciliation; step 1 is D-026.

**D-009 — Pixel-first units.** The source is px-based (about 13.4k px vs 73 rem; root font-size 10 px), so block CSS is
authored in px and fixed px values are not converted to rem/em/clamp. *Source:* `breakpoints.json` (`unitsNote`).

**D-010 — No build step, zero runtime dependencies.** Native ES modules, no frameworks, no transpiling.
`scripts/aem.js`, `head.html`, `package-lock.json` and `node_modules/` are never modified. *Source:* AGENTS.md
(No-Build and Untouchable-Files rules).

**D-011 — Branching strategy.** `feature/<TicketAndName>` → `develop` (QE) → `uat` (business) → `main` (production), by
pull request only; code moves forward only; Leads own the `uat` and `main` PRs. *Decided by:* `n/d` (the doc doesn't
say who). *Source:* [docs/BRANCHING.md](BRANCHING.md). Not yet applied to Adobe code drops, which merge straight
into `main` (PRD §8.6, §12).
*Correction (2026-10-16):* the rule is not enforced. In the repository checked, `develop` has no branch protection and no
check is required to merge; PRs #9, #10 and #14 merged with `a11y` and `aem-psi-check` failing (PRD §11).

**D-012 — Repoless: one repo, two sites.** The Foundation site is live first and canonical; USTA.com follows. Each site
has its own DA content source (`<name>-dev`, `<name>-com`) and its own martech config sheet; Akamai fronts both
production domains. **Not decided:** whether to use a shared profile for common settings. *Source:* README,
[docs/MARTECH.md](MARTECH.md).

**D-013 — Revert the inline Fundraise Up embed (2026-09-06).** The real widget hit two CSP walls: Trusted Types blocks its
`document.write`, and its checkout frame is refused (`frame-ancestors 'none'`) when nested in an iframe. Result: the
`?form=<code>` links that open the Fundraise Up overlay via `scripts/donate.js` stay, and the dedicate-name round-trip is
not supported. *Source:* MIGRATION.md, entry 2026-09-06. Revisit only if the CSP can change.
*Correction (2026-10-15):* *Decided by:* user. *Why not fix it then:* running the loader in-page needed a site-wide Trusted
Types `default` policy, "a global weakening of XSS protection" (MIGRATION.md 2026-09-06). The inline part is superseded
by D-040; the `?form=` overlay stays.

**D-014 — One site-config module, no code defaults (2026-10-07).** The develop and martech config layers were merged
into `scripts/site-config.js`. Missing or invalid sheet values are simply not used, so with no sheet there is no Tags or
Target. *Decided by:* user. *Source:* MIGRATION.md, entry 2026-10-07. (The Martech 1/4 restructure in D-015 later
reshaped this module.)
*Correction (2026-10-15):* the 2026-10-07 merge (`cabc915`, only on `aem-coder-branch`) also set host-based environment
rules (localhost and `*.aem.page` = development, `main--*.aem.live` = production, other branch `*.aem.live` =
development, other hosts = production), `.production` / `.development` key lookups and `getMartechConfig()`. Martech 1/4
(`2e8c8f0`, 2026-10-14, on `develop`) removed all three: each environment is its own DA site and values are used as-is.
`window.ustaSiteConfig` is now `window.hlx.siteConfig`. One module and no code defaults carry over.

**D-015 — Config sheet: one tab per page-load phase (2026-10-14).** `/configs/site-config` has `eager`, `lazy` and
`delayed` tabs, each fetched once when its phase first needs it. *Why:* keeps each request small (about 1.5 KB budget),
avoids a config request on non-Target pages in the eager phase, and fits repoless sites since each environment is its own
DA site (no `.production` / `.development` lookups). *Source:* MIGRATION.md, entry 2026-10-14; docs/MARTECH.md.

**D-016 — Link targets (2026-10-08).** The customer revised the earlier "every link opens in a new tab" requirement.
Internal links open in the same tab; external hosts and file downloads open in a new tab (`target="_blank"` +
`rel="noopener"`); authors can append `#_blank` to force a new tab. Anchors, `javascript:`, `mailto:`, `tel:` and `?form=`
donate links are left alone. *Decided by:* customer. *Supersedes:* the 2026-09-28 "every link" rule. *Source:* MIGRATION.md,
entry 2026-10-08 (`decorateLinkTarget()` in `scripts/scripts.js`).

**D-017 — Dark CTA authored as bold + superscript (2026-10-10).** DA stores a strikethrough as literal `<del>` text, so
the dark CTA broke after a save. A full flip of the formatting marks was tried and reverted ("keep the change small").
*Decided by:* user. *Source:* MIGRATION.md, entry 2026-10-10. Related, same date: CTA styles keep their different sizes
(dark/outline 46 px vs blue 40 px) by user decision.

**D-018 — Related Articles capped at 3 (2026-10-09).** 23 news pages author `max-items: 4`, so the feed was unbounded.
`templates/news/news.js` clamps it (`MAX_LIMIT = 3`; empty, 0, negative or non-numeric falls back to 3) with no content
edits. *Source:* MIGRATION.md, entry 2026-10-09.
*Correction (2026-10-15):* *Decided by:* n/d. The source shows **4** cards on 9 news pages (the newer 2026 articles,
`tools/importer/planning/news-fleet-scan.md`), so the cap is a departure from the source. Who approved it is open
(PRD §12).

**D-019 — Import by template, news detail first (2026-09-05).** Site scope was found by sitemap plus crawl: 86 pages and
21 documents in 8 templates, with 84 % of pages one template (news detail). One profile-driven importer per template,
highest leverage first. *Source:* MIGRATION.md §2a. The news pages were bulk-imported on 2026-09-07.

### Decisions found in MIGRATION.md, git history and branches (added 2026-10-15)

#### Design system and layout

**D-020 — No tiers beyond 768 / 992 / 1200, even where the source switches elsewhere (2026-09-03).** A header breadcrumb
`width >= 1440px` tier was removed on 2026-09-03 because it broke the Breakpoint Rule; wide-desktop changes use fluid
caps instead (e.g. hero column `min(calc(50vw - 90px), 870px)`). The USTA header JOIN / SIGN IN buttons go compact below
1200, not usta.com's 1370 (MIGRATION.md §3 item 9). On 2026-10-07 the user kept the crumb row at 30 vs 40 px for
1200–1369 rather than add a 1370 tier. Extends D-007, which excluded 1370. *Decided by:* n/d (2026-09-03); user
(2026-10-07). *Source:* MIGRATION.md 2026-09-03, §3 item 9, 2026-10-07.

**D-026 — Fixed mobile column (2026-09-05; 336 px from 2026-09-23).** The source lays mobile content in fixed-width,
centred columns whose side margins grow with the viewport. Our viewport-scaling gutters (15 px from 2026-09-03; a 31 px
padding gutter, reverted) widened content on larger phones and ran it under the fixed 53 px Fundraise Up tab. So
`main > .section > div` got one global fixed column (328, tuned to clear the tab), which replaced the per-block mobile
padding hacks. On 2026-09-23 it became 336 to match the customer's spec; element geometry (card heights, hero 348) was
left alone. Step 1 of the reconciliation; D-008 is step 2. *Decided by:* user (global rule for Donate-tab clearance,
2026-09-05); customer spec (336, 2026-09-23). *Source:* MIGRATION.md 2026-09-05, 2026-09-23; `styles/styles.css`.

**D-031 — Display font blocks (2026-09-07).** The swap from the Arial fallback to Graphik XXCond Bold moved the news H1
~356 px (live CLS 0.47). `preloadDisplayFont()` (`scripts/scripts.js`) preloads the ~24 KB woff2 and declares the face
inline in the eager phase, because `fonts.css` loads lazily on mobile. A metrics-matched fallback
(`graphik-xxcond-fallback`, size-adjust 50.6 %) is a safety net. `font-display: optional` was tried the same day and
reverted: on mobile it locked the wide fallback for the whole page view. Deviates from the typography-system skill's
`swap` default, for this face only. *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-07 (three entries).

**D-032 — One H1 size site-wide (2026-09-07).** H1 is 54/59.4 px on mobile and 100/110 px from 768 on every template, so
the display-font fix applies everywhere and template CSS can load without blocking the LCP H1 (`loadTemplateCSS()` is no
longer awaited). The source H1 colour does vary (news #333, section landings #000, hero #fff), so colour and margins stay
per template (e.g. `templates/news/news.css`). Related (2026-09-06): default body copy is #000 because the source's prose
is black; `--text-color` stays #333 for the quote-tweet body and image captions. *Decided by:* user ("Per direction").
*Source:* MIGRATION.md 2026-09-06, 2026-09-07.

**D-043 — One critical stylesheet (2026-09-24).** `styles.css` began with `@import url('brand.css')`, which chained a
second render-blocking request (~450–600 ms on mobile). `head.html` is untouchable, so a second `<link>` was not an
option. The used tokens were inlined into `:root` and `styles/brand.css` was deleted (`dc76f8b`, Adobe drop PR #1; on
`develop` and `main`). Learned 2026-09-29: a token that authored content names is part of the authoring contract
(`--cards-band-bg` was deleted as dead, the `/en/home` blue strips went transparent, and it was restored as an alias of
`--section-blue-bg`). AGENTS.md (Typography Rule; design-tokens step 3), `skills/typography-system/SKILL.md` and
`skills/README.md` still say `styles/brand.css` and need updating. *Decided by:* n/d. *Source:* `dc76f8b`; MIGRATION.md
2026-09-24, 2026-09-29.

**D-059 — Site-wide 24 px text rhythm (2026-10-07).** The source separates a heading and each paragraph with an authored
empty `<p>&nbsp;</p>` (one 24 px line), so `main .default-content-wrapper > :where(h1…h6, p) + p:not(.button-wrapper)`
gets `margin-top: 24px` site-wide (and the same in default `columns` text cells). The opt-in `spaced` section style tried
first was removed and its importer change reverted. Known deviations: the get-involved and what-we-do intros and the
college-scholarships heading → paragraph are 0 px on the source; home, our-impact, financials, YPI and 404 are not yet
source-checked. On `develop` since `e910fb9` (PR #9, 2026-10-13). *Decided by:* user. *Source:* MIGRATION.md 2026-10-07.

**D-061 — Widget cards use the widget's font (2026-10-09).** Replaces the 2026-09-04 rule "never adopt a third-party
widget font", under which `cards (expand)` (and on 2026-09-06 the retired `custom-form-donate`) used Graphik with matched
metrics. The 2026-10-09 parity pass self-hosted IBM Plex Sans 400/600 latin woff2 (SIL OFL; `fonts/ibm-plex-sans-*`,
`@font-face` in `styles/fonts.css`, token `--widget-font-family` in `blocks/cards/cards.css`). On `develop` and `main`
since `e910fb9` (PR #9). *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-04, 2026-10-09.

#### Blocks, sections and authoring

**D-022 — No duplicate or default-content blocks (2026-09-03, 2026-09-05).** `banner-stats` was deleted as a duplicate of
the homepage `columns (stats)` ribbon; `banner-stats-grid` was kept because it is a different layout (white 2×2 grid).
`downloads` (heading + PDF list) became default content, `<h2>` + `<ul><li><a>`, as the source authors it (EDS never
buttonizes `<li><a>`); its styling moved to global default-content rules in `styles/styles.css`. The same rule was later
applied to the Mission Statement (D-024) and `custom-content-related-articles` (D-041). Applies PRD R-B1. *Decided by:*
n/d (the log says "per direction" for banner-stats). *Source:* MIGRATION.md 2026-09-03, 2026-09-05.

**D-023 — Base block + variant (2026-09-04).** In EDS, `Cards (content)` renders `class="cards content"` and loads only
`blocks/cards/`. So `cards`, `columns`, `hero` and `quote` each became one block whose `decorate()` dispatches on the
variant class. The section wrapper class comes from the block's first class (`.columns-container` for every columns
variant), so rules keyed on a per-variant container were rescoped with `:has()` (e.g.
`.columns-container:has(.columns.stats)`). Importer parsers must emit the parenthesised names (fixed 2026-09-05).
*Decided by:* n/d. *Source:* MIGRATION.md 2026-09-04, 2026-09-05.

**D-024 — Colour and layout are separate section styles (2026-09-04, 09-05, 09-08).** Colours are section styles
(`section-blue`, legacy alias `highlight`; `section-yellow`), so the cream background was removed from `cards (stats)`.
Width and alignment are separate styles (`center`, `narrow`, `center-intro`, later `medium`, `wide`), authored together,
e.g. `center, narrow` or `section-yellow, center-intro`. `yellow-center-intro` was removed because it mixed a colour with
a layout, and all 5 general importers were updated. The Mission Statement stopped being `columns (statement)` and became
default content with `center, narrow` (user direction, over a section-specific `statement` class). *Decided by:* user
(center/narrow); n/d (rest). *Source:* MIGRATION.md 2026-09-04, 2026-09-05, 2026-09-08.

**D-027 — Split, not float (2026-09-06).** The first `float-left` section style (an 810 px container with the block
floated left) was replaced the same day by `split-left`: from 768 the section is a grid of two equal, independent columns
at the normal content width (30 px gutter), so text never wraps under the block; below 768 everything stacks. *Why:* the
source measures as two 555 px columns with `float: none`, and the float both narrowed the section and let long text wrap
under the tweet. `split-right` (the mirror) followed the same day. The news importer builds tweet, Instagram and
video-beside-text as these sections (2026-09-07/08). *Decided by:* n/d (user screenshots flagged the float). *Source:*
MIGRATION.md 2026-09-06 (CORRECTION entry).

**D-028 — Tabs over whole sections (2026-09-06).** EDS cannot author a block inside a block. So each tab panel is a whole
section tagged with Section Metadata `profile-anchor`, and the `toc-profile` block is only the tab row (rows
`label | slug`). It started as a sticky scroll-spy anchor bar and was changed the same day to tab behaviour (only the
active section shows), matching the source. Source-style `#tab=<key>` deep links followed on 2026-10-01. Hyphenated
section-metadata keys now go through `toCamelCase`. The unused `tabs` block was deleted. Refines PRD R-B2: the tab row is
a block, the panels are sections. *Decided by:* user ("per direction"; name "per request"). *Source:* MIGRATION.md
2026-09-06, 2026-10-01; `blocks/toc-profile/toc-profile.js`.

**D-029 — Equal-height profile cards (2026-09-06).** The source's profile cards hug their content (measured 471/477/471/
471 px). A hug-content change (`align-items: start`) was made and reverted the same day; `.cards.profile > ul` keeps the
grid default `align-items: stretch`, so the boxes line up across each row. *Why:* user preference over exact parity.
*Decided by:* user. *Source:* MIGRATION.md 2026-09-06 (two entries).

**D-030 — Index-driven breadcrumb (2026-09-06).** The source breadcrumb is not built from the URL: it uses managed titles
(slug `financials` → "Annual Reports and Financial Information") and hides the /news/ level. Ours reads labels from
`/query-index.json` (`breadcrumbtitle`, else `title`), and authors can override per page with `Breadcrumb Title`. The
index regenerates on publish, so a new page gets the right label with no separate breadcrumb sheet. Chosen over
slug-derived labels. *Decided by:* user ("page metadata + query-index", "match source / skip news"). *Source:*
MIGRATION.md 2026-09-06; VALIDATION.md §2; `blocks/header/header.js`.

**D-033 — Theme, not Template, for CSS-only page types (2026-09-08; 2026-09-15).** `Template` makes `loadTemplateCSS()`
fetch `templates/<name>/<name>.css`, which 404s for a page type with no stylesheet; `Theme` only adds the `body.<name>`
class. The leadership importer writes `Theme: leadership`, the general-page importers write `Theme: general`, and only
news writes `Template: news` (it has its own CSS + JS). The stub `templates/leadership/` was deleted and there is no
`general.css`. Layout rules key on section style + content shape (e.g. `.section.split-even > .default-content-wrapper`),
not on the theme: a `body.general` scope was tried and reverted on 2026-09-15. No CSS has used `body.general` since
`e910fb9` (PR #9). *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-08 ("Template→Theme decision"), 2026-09-15,
2026-10-07.

**D-037 — Images come from content (2026-09-09).** The homepage hero photo and the collage's third portrait were baked
into CSS; both moved into authored content and their files were deleted from `blocks/`. The hero `banner` uses its
authored image row as an inline background; with no image it shows the 40 % overlay on `--brand-blue`. The
`columns (feature)` collage takes 3 authored images. Only UI glyph SVGs stay in code (`icons/`). *Why:* lift-and-shift;
authors manage every image. *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-09 ("All images author-managed").

**D-038 — One icons folder (2026-09-09).** Block-local icon folders (`blocks/hero/icons/`,
`blocks/custom-widget-reactions/icons/`) were merged into the root `icons/`. Code builds icon URLs with the aem.js
pattern `window.hlx.codeBasePath + '/icons/'`, not block-relative `import.meta.url`, so icons load on any deploy path.
The USTA button icons follow the same rule (`icons/usta-buttons-icons/`). *Decided by:* n/d. *Source:* MIGRATION.md
2026-09-09.

**D-051 — Reactions removed (2026-09-30).** The customer asked for the Reactions bar ("Reactions" + emoji row) to come off
all news pages, a deliberate exception to source parity. The 62 affected pages were cleaned and published by the author.
The block and its 6 emoji icons were then deleted (PR #8, `dd654a3`, 2026-10-07), and `import-news-v1` drops
`div.reactions`, so a re-import cannot bring it back. MIGRATION.md cites a `tools/content/remove-block.mjs` script for
the clean-up; it is not in this repo. *Decided by:* customer. *Source:* MIGRATION.md 2026-09-30 (two entries);
`tools/importer/import-news-v1.js`.

**D-054 — `split-5-6` (2026-10-02).** On the Chris Evert 50th page the source puts the text on 5 and the image on 6 of
the 12 grid columns, with column 12 empty, from 992 (328 / 708 wide below that). A `split-5-6` *columns* variant was tried
and reverted on user direction; `center-intro, medium` was rejected as too narrow, so the upper section is
`center-intro, split-5-6`. In the lower `split-even` section the quote and form widths live in the blocks (`quote.css`,
`donate-embed.css`, scoped to `.section.split-even`), not in a `split-even, medium` combination (reverted). *Decided by:*
user. *Source:* MIGRATION.md 2026-10-02 (three entries).

**D-058 — Mobile columns centring on all non-news pages (2026-10-07).** On the inner pages the source centres the
columns text cell on phone and tablet (heading → first paragraph 0 px); from 992 it is left-aligned with 24 px. News
articles stay left-aligned. By user direction the rule is scoped to `body:not(.news)` instead of `body.general`, so it
does not depend on the theme. The `feature`, `stats`, `statement` and `profile` variants are excluded. *Decided by:*
user. *Source:* MIGRATION.md 2026-10-07; `blocks/columns/columns.css`.

**D-064 — Image tooltips site-wide (2026-10-13).** On request, every image with alt text shows it as a native tooltip on
hover. `decorateImageTooltips()` in `scripts/scripts.js` is one delegated `mouseover` listener (like
`decorateLinkTargets`), so header, footer, block and feed images are covered with no per-block code, and nothing runs
before the first hover. Decorative (`alt=""`) images are skipped and an authored `title` wins. Links, by contrast, carry
no `title` tooltip, matching the source (EDS-51, 2026-10-01). *Status:* uncommitted in the working tree on 2026-10-15.
*Decided by:* n/d ("on request"). *Source:* MIGRATION.md 2026-10-01, 2026-10-13.
*Update (2026-10-16):* committed in the `feature/codesyncandcodebaseswitch` PR to `develop`; on `develop` since PR #15 (`2860acd`).

**D-076 — Codebase switch panel reloads the canvas with `?ref=<branch>` (2026-10-16).** A DA library plugin
(`tools/plugins/codebase-switch/`) lists the three environment branches `main`, `uat` and `develop` (BRANCHING.md). The author
picks one and selects **Go**, and the editor reloads at `https://da.live/canvas?ref=<branch>#/usta-digital/foundation-dev/index`,
which is always that page, as asked. One parameter is enough because the canvas uses `?ref=` both for the preview code
(`fetchWysiwygBranch`) and for the plugin sources (`https://<ref>--<site>--<org>.aem.live/…`). The panel asks DA to
navigate through the SDK's `setHref` (DA sets its own `location.href` and accepts only https URLs or `/paths`). It does
not navigate `window.top` from inside the cross-origin iframe. Outside DA it falls back to `window.open(url, '_top')`.
Only a listed branch is accepted. The branch list, URL and messages live in `codebase-switch.html` (Localization Rule).
*Decided by:* user (options, Go button, target URL); Claude (`setHref`, allow-list). *Source:* MIGRATION.md 2026-10-16.
Open: keep the author's current page and site instead of `foundation-dev` `index` (PRD §12 Q31).
*Superseded by D-077 (2026-10-16), before merge.*

**D-077 — Env selector keeps the open page and only sets `?ref=` (2026-10-16).** Replaces D-076's fixed target URL. The
plugin is renamed `env-selector` (`tools/plugins/env-selector/`, DA library title `Environment`). Go takes the page open
in the editor and sets `ref` in its canvas URL to the chosen branch: an existing `?ref=` is replaced, and a URL with none
(`da.live/canvas#/…`, which means `main`) gets `canvas?ref=<branch>#/…`. The panel is a cross-origin iframe and DA sends
no referrer beyond its origin (and a referrer never carries the hash), so the URL is rebuilt from the SDK context: the
canvas `hash`, else `#/<org>/<repo><path>`, on the editor path `/canvas` from the HTML. It goes to `setHref` as a
relative `/canvas?ref=…#…`, so DA resolves it on its own origin. Other query parameters on DA's URL are not known and
are dropped. Picking the current branch does not reload; outside DA, Go stays disabled (no page to switch). *Why:*
authors stay on the page they are editing, and the panel works on every site it is registered on. *Decided by:* user
(rename, keep the current URL, the no-ref case); Claude (rebuild from context, relative `setHref`, no-op on the same
branch). *Source:* MIGRATION.md 2026-10-16 (Env selector); PRD R-A7, §12 Q31.

**D-078 — Env selector branches come from a DA sheet (2026-10-16).** The dropdown options are the `code` tab of the DA
sheet `/.da/environments/config` (created by the user): `title` is the option text and `value` the branch written to
`?ref=`. It is read like the Buttons panel's `/.da/library/buttons` sheet, through the SDK's `daFetch` from
`https://admin.da.live/source/<org>/<repo>/.da/environments/config.json`, so it is saved, not published. Other tabs are
ignored. Column names are matched case-insensitively and trimmed; a row whose value is not a branch name
(`^[a-z0-9-]+$`) or repeats an earlier value is skipped; an empty title shows the value. When the sheet cannot be read
or has no valid row, the built-in `main`, `uat`, `develop` options in `env-selector.html` are used. *Why:* authors and
leads can add or rename environments without a code change. *Decided by:* user (sheet, tab, columns); Claude (fallback,
validation). *Source:* MIGRATION.md 2026-10-16 (Env selector branches from a sheet); PRD R-A7.

**D-079 — Env selector content picker (2026-10-16).** A **Content** list sits before **Branch**, from the sheet's
`content` tab (`title` = text, `value` = a DA site name). Go splits the open page's hash `#/<org>/<site>/<path>` on `/`,
replaces the second segment (the site) with the content and sets `?ref=` to the branch; the org and page path are kept
(`…?ref=feature-envselector#/aman-kumar24-dev/usta-foundation-site/en/home` → `…?ref=develop#/aman-kumar24-dev/<content>/en/home`).
Both lists preselect what is open; Go is enabled only when both have a pick and at least one differs (extends D-077's
"only a different branch"). Without a `content` tab the list holds just the open site; an open site that is not listed
leaves "Select content". The two pickers share one grid column, so they always have the same width (240 px, shrinking
together), with Go beside the branch picker. *Why:* switch between content sites and code branches from one panel.
*Decided by:* user (content list, position, width, the site-segment rule, both picks on Go); Claude (enable rule,
fallbacks). *Source:* MIGRATION.md 2026-10-16 (Env selector content picker); PRD R-A7.
*Partly superseded by D-080 (2026-10-16):* the equal-width column and the "Select content" prompt for an unlisted open
site.

**D-080 — Env selector design from the user's mockup (2026-10-16).** The panel follows the user's mockup. (1) DA's panel
header already shows the title the panel sends, so the panel draws no header; its `<h1>` is visually hidden. (2) One row:
a Content card and a Branch card, each with its label inside above the picked value, sharing the row 3:4 (the branch
card is wider for branch names) and shrinking with the panel, then a 56 px round Go button with an arrow (`aria-label`
"Go"); the row is at most 360 px wide. This replaces D-079's equal-width column. (3) The open list uses the customizable
select (`appearance: base-select`, `::picker(select)`, `::checkmark`, `<button><selectedcontent>` for the ellipsis) where
the browser has it, and the native list elsewhere. (4) An open site or branch that the sheet does not list (e.g.
`feature-envselector`) is added at the end of its list and preselected, as in the mockup, instead of showing the prompt
(D-079); there is no "(current)" suffix. (5) The status line is a dot (green: what is open, blue: switching, red: a
problem) and "Currently on {content} with {branch}" (the user's wording). The fixed branch hint is removed. (6) Card
borders stay Spectrum gray 500 (`#8f8f8f`, 3.3:1 on white) rather than the mockup's lighter grey, for the ≥ 3:1 UI-border
rule (skills/accessibility). *Decided by:* user (mockup, status text); Claude (base-select with fallback, the border
colour, tones). *Source:* MIGRATION.md 2026-10-16 (Env selector redesign); PRD R-A7.

**D-081 — Env selector: "CodeBase" label, stacked up to 576 px (2026-10-16).** The Branch card's label reads
**CodeBase** (the "Select a branch" prompt and the messages are unchanged). Up to 576 px wide the two cards stack, the
same width, with Go beside the CodeBase card; from 577 px they sit in one row, 3:4 (D-080). The CSS stays mobile-first
(`@media (width >= 577px)`). *Deviation from the Breakpoint Rule:* 577 px is not one of the site's breakpoints
(768 / 992 / 1200, `tools/quality/breakpoints.json`). It is accepted because the rule exists to copy the source site's
breakpoints onto site pages, and this is a DA tool panel inside an iframe, whose media queries see the panel's width,
not a page's; `breakpoint-check` does not scan `tools/` by default, and run on this file it reports the 577 px step.
*Consequence:* DA's tools panel opens 400 px wide (`registerPanelSection('tools', { width: '400px' })` in
`blocks/canvas/canvas.js`), so authors see the stacked layout unless the panel is wider. *Decided by:* user (label, the
576 px rule); Claude (mobile-first form, Go beside the CodeBase card). *Source:* MIGRATION.md 2026-10-16 (Env selector:
CodeBase label, stacked up to 576 px); PRD R-A7.

**D-082 — CodeBase takes a typed or pasted branch (2026-10-16).** The CodeBase card is an editable combobox (ARIA 1.2:
`input role="combobox"` + `ul role="listbox"`, `aria-activedescendant`, Arrow keys / Enter / Escape, a chevron button
outside the tab order) instead of a select. The author picks a listed branch or types / pastes any branch. (1) A typed
branch is written the way DA's `normalizeBranch` and AEM write a branch in a host name: trimmed, lowercase, every
character other than `a-z`, `0-9` and `-` → `-` (`feature/EDS5Hotjar` → `feature-eds5hotjar`); a typed title or value of a
listed branch is that branch. (2) The list never filters: the typed branch (when not listed) is the first row, then
every sheet branch, then an unlisted open one, so what was typed always appears along with the config options. (3)
Sites and branches, typed or from the sheet, must be lowercase letters and digits with single hyphens between them
(`^[a-z0-9]+(-[a-z0-9]+)*$`): a `--` would split `<branch>--<site>--<org>`, and a leading or trailing `-` is not a host
name; this tightens D-078's `^[a-z0-9-]+$`. (4) `<branch>--<site>--<org>` must fit one DNS label (63 characters; the
limit that broke the `feature/codesyncandcodebaseswitch` preview). Either problem disables Go with a red message; the
length one at once, the name one when the field is left, so typing `feature-` on the way to `feature-x` does not flash
an error. (5) Typed branches are not remembered across reloads: browser storage is per origin, and the panel's origin
changes with the branch it is loaded from; after Go, the typed branch is the open one and is listed again. *Decided by:*
user (type/paste, listed with the config options); Claude (combobox pattern, normalisation, validation, no storage).
*Source:* MIGRATION.md 2026-10-16 (Env selector: type or paste a branch); PRD R-A7.

#### Buttons and links

**D-025 — Path-bearing donate links (2026-09-04).** Author `form=<CODE>` links as full URLs (e.g.
`https://www.ustafoundation.com/en/home/get-involved/special-funds.html?form=<CODE>`); `scripts/donate.js`
`wireDonateTriggers()` rewrites them to `<current path>?form=<CODE>`. *Why:* on production every card DONATE resolved to
home, because DA publishing turns a query-only href (`?form=JLLI`) into `/` (the nav DONATE survived because it was
absolute). *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-04.

**D-062 — USTA button scope and naming (2026-10-11).** A crawl of 3,388 usta.com EN pages found 119 button variants. 68
designs (28 style names + colours / icons) are usta.com's own system and were built. 51 are out of scope: section
microsites, ustacoaching.com and third-party widgets (Termly, Auth0, forms). Customer feedback said `style="usta"` didn't
say how the button looks, there were too many options, and full-width buttons stretched. So the style name now says the
look: `usta-` + words (`pill | outline | square | app`, `medium | small | mini | compact`, `wide | narrow | column`,
`padded`, `disabled`), replacing `style="usta"` and the height / width / font-size / shape / padding / disabled options.
There is no width / height / size option. Icons are a USTA-only feature; Foundation buttons are unchanged. *Decided by:*
customer feedback; user (no size option: "too many options for authors"). *Source:* MIGRATION.md §3 Buttons item 9;
entry 2026-10-11 "USTA buttons v2".

**D-063 — USTA icons are content (2026-10-11).** *Why:* new SVGs should show in the Buttons panel without a code change.
`USTA_ICONS` was removed from `scripts.js` and the panel; `ustaIconName()` accepts any safe file name
(`^[a-z0-9]+(-[a-z0-9]+)*$`), still only inside a `usta-…` button. The Icon dropdown is built from the `icon` row of
`/.da/library/buttons` (`options` tab): row order = dropdown order, and with no row there is only "No icon". New icon =
push `icons/usta-buttons-icons/<name>.svg` + add `<name>` to the row. *Trade-off:* a typo becomes a 404 icon instead of
staying as text. Replaces the in-code list added the same day. *Decided by:* n/d. *Source:* MIGRATION.md 2026-10-11;
`tools/plugins/buttons/README.md` §4, §5.2.

#### News and Related Articles

**D-034 — News listing stays blank (2026-09-08).** MIGRATION.md §2a planned a `cards (news)` feed for T2, but the source
`news.html` has no H1 and no article list. For parity only Title "News" and Theme general are imported; no feed is built.
*Decided by:* n/d (the log says "Per direction"). *Source:* MIGRATION.md 2026-09-08;
`tools/importer/import-news-listing-v1.js`.

**D-041 — Related Articles is a template feature (2026-09-22).** The source feed is a dynamic AEM list on one blanket tag
(`usta-foundation`), so cards snapshotted at import time would go stale. `templates/news/news.js` rebuilds the feed at
decoration time from `/news-index.json` as a `cards (news)` block, in the `related-articles` section or an appended one.
Page metadata drives it: `List From` (`children` / `tags` / `static`), `Sort Order`, `Max Items`, `News Tags`, `Pages`.
This replaced a fixed "latest 3, newest first" template feed. The retired `custom-content-related-articles` block was a
duplicate of `cards (news)` (removed 2026-10-06). D-018 builds on this. *Decided by:* n/d. *Source:*
`templates/news/RELATED-ARTICLES.md`; MIGRATION.md 2026-09-10, 2026-09-22, 2026-10-06.

**D-042 — News dates and tags (2026-09-22).** The original publish dates were lost when the source was republished. On
2026-09-07 the importer was set to use the sitemap `<lastmod>` for every article; on 2026-09-10 that proved to be a
bulk-republish stamp (only the 12 articles shown in related cards have a real date on the source, and 2 were corrected).
On 2026-09-22 the date was set on those 12 and left empty on the other 60, so the feed falls back to the index date. Tags
come from each source page's `data-tags` (70 of 73 carry `usta-foundation`), replacing "tag only the 12 related-card
articles" (2026-09-10). Applied to the `drafts/rusmeen` copies. **Note:** `import-news-v1.js` still writes the sitemap
lastmod and no `News Tags` row, so a re-import undoes both rules (PRD §11). *Decided by:* n/d. *Source:* MIGRATION.md
2026-09-07, 09-10, 09-14, 09-22.

**D-056 — Related Articles thumbnails follow the source (2026-10-06).** Thumbnails were decorative (`alt=""` inside an
`aria-hidden`, `tabindex=-1` image link), and the same-day alt-text audit had kept that. It was replaced by the source
pattern, which matches on all 11 source cards checked: `alt="Visit the <title> page"`, a normal image link, and
`title` = the index `imagealt` (`og:image:alt`, which EDS fills from the Metadata **Image Alt** row, else from the first
content image's alt). On `develop`/`main` since PR #8 (`dd654a3`). *Decided by:* n/d. *Source:* MIGRATION.md 2026-10-06;
`templates/news/news.js` `newsRow()`.

#### Import and content

**D-035 — One importer per unique layout (2026-09-08).** get-involved, what-we-do, our-impact, special-funds,
college-scholarships, chris-evert, YPI, financials and news-listing each got a dedicated importer instead of running
through the who-we-are importer (`import-general-v1`), as the HANDOFF note planned. *Why:* each page has a unique section
sequence, and a generic importer "is only worth it across pages sharing a layout, like news". *Trade-off:* this departs
from the Content-Import Rule ("no such thing as a per-page import script"); most of these scripts hard-wire their content
and copy block builders between them. *Decided by:* n/d (the log says "per direction"). *Source:* MIGRATION.md
2026-09-08 (get-involved, what-we-do, our-impact, special-funds).

**D-036 — Source's broken links kept (2026-09-08).** The full-site audit (84 pages, 367 links) found 0 broken links
introduced by the migration. The 9 `/en/home/stay-current/national/<slug>` related-article links and the failing external
links in news bodies fail on the source too. A lift-and-shift carries them over unchanged, because new targets would be
guesses; flag them to the owner instead. *Decided by:* n/d. *Source:* VALIDATION.md §1; MIGRATION.md 2026-09-08;
`skills/content-import/IMPORTING-GUIDE.md` §12.

**D-050 — DA content mirrored from aemdemos (2026-09-28).** Our DA content is mirrored from Adobe's DA
`aemdemos/foundation-usta` with `npm run da:sync` (`tools/da-sync/`): mirror all, never delete,
back up the destination first, preview only (never publish), run on request; `/.da/library` included from 2026-09-29.
*Why:* DA's copy API is same-org only, and no hosted endpoint was wanted. *Decided by:* user. *Status:* the tool is only
on `aem-coder-branch` (`b1771d1`, `e0cee4d`). When syncing stops is open (PRD R-I10). *Source:* `.ema/plan.md` and
`tools/da-sync/README.md` on that branch.

#### Embeds, donations and performance

**D-021 — Third-party embeds (2026-09-03, revised per embed).** First rule: the tweet quote, Instagram post, YouTube video
and donation form were rebuilt as self-contained or consent-gated blocks, not live third-party scripts. *Why:* consent and
performance. Later reversed one embed at a time to match the source: Instagram renders the real post via `embed.js` with
no gate (2026-09-05, "per direction"); the donation form became the real Fundraise Up inline embed (D-040); the homepage
video became the real YouTube player (D-055). Still self-contained: the `quote` tweet variant (static) and `video-embed`
(consent gate when its Row 2 is authored). None of these blocks reads the site consent state (`window.hlx.consent`).
*Decided by:* n/d (Instagram "per direction"; donation form after a user observation). *Source:* MIGRATION.md 2026-09-03,
2026-09-05, 2026-09-15, 2026-10-02.

**D-039 — Delayed phase at 3 s (2026-09-10; reaffirmed 09-15, 09-27, 10-01).** Keeps third parties off the LCP/TBT path:
the old Tags library costs about 3.5 s of main thread on throttled mobile, and `head.html` is untouchable. On
`aem-coder-branch` the timer was cut to 2 s (`95f6fea`, 09-27) and put back to 3 s (`a227503`, 10-01), because at 2 s
Tags fell inside standard Lighthouse runs (Best Practices 96 → 75). `develop` has had 3 s since `ce9ed31`. Exception:
`donate-embed` loads Fundraise Up eagerly, because there the form is the page's main content. The residual mobile Speed
Index (~4.9 s on a news page, Core Web Vitals green) is accepted rather than loading Fundraise Up earlier. *Decided by:*
n/d (2026-09-10); agent, agreed (Tags in delayed, 09-27); user (back to 3 s, 10-01). *Source:* `scripts/scripts.js`
`loadPage()`; MIGRATION.md 2026-09-10, 2026-09-15, 2026-09-24; `.ema/plan.md` on `aem-coder-branch`.

**D-040 — Inline embed via `donate-embed` (2026-09-15).** Use Fundraise Up's native inline embed, with the element ID
authored as plain text in a `donate-embed` block. *Why:* matches the source, less code than the hand-built
`custom-form-donate` (retired), and with eager loading the form's script is requested at ~384 ms instead of ~3.2 s. The
`?form=` overlay links stay. *Note:* `scripts/scripts.js` has had a site-wide Trusted Types `default` policy since
`ce9ed31` (pass-through for scripts and script URLs), plus pass-through policies in the widget's frames
(`scripts/donate.js`). D-013 records the user declining such a policy, and MIGRATION.md does not say when or why it was
added (PRD §11 security risk). *Decided by:* n/d. *Source:* MIGRATION.md 2026-09-15.

**D-055 — Real YouTube player on the homepage (2026-10-02).** The source shows YouTube's own chrome (red play button,
title, Share, "Watch on YouTube"). `columns.js` `embedVideo()` renders the authored embed URL as a real iframe through an
IntersectionObserver (`rootMargin: 300px`), with the YouTube poster holding the box until then and no autoplay. A load
that never reaches the video (e.g. PageSpeed) loads no YouTube scripts. Replaces the 2026-09-10 click-to-load facade for
this block; `video-embed` keeps its consent gate. *Decided by:* n/d. *Source:* MIGRATION.md 2026-10-02.

#### Martech and consent

**D-044 — Analytics through Tags (2026-09-27).** The site only injects the Tags embed (`script.launch` row, delayed tab);
the library sends the page view. No Web SDK / Edge Network. Production uses USTA's existing "USTA Foundation" library
(`launch-b4bd8f30c678.min.js`) unchanged; an Analytics-only library comes later as a URL change only. That library still
holds Adobe Target and a Hotjar rule, which must be removed before site code loads those vendors in production. Not
merged: a self-hosted AppMeasurement + at.js-in-`head.html` stack (`5ff64e1`, `feature/adobeAnalytics` only), which the
untouchable `head.html` would not allow. *Why:* requested method; keeps the existing Launch/AA setup; fastest path.
*Decided by:* user (`.ema/plan.md`). *Source:* `4250dab` (`aem-coder-branch` only), `7e3c377` (`develop`); MIGRATION.md
2026-09-27; docs/MARTECH.md §3.

**D-045 — Target in site code (2026-09-27; refined 2026-09-28).** at.js 2.11.4 (aem.live build) loads in the eager phase,
only on pages with `Target` metadata and `target.enabled`. *Why:* keeps at.js off all other pages. Two at.js instances
conflict, so production stays off until USTA's Tags library drops Target. Anti-flicker: the first section waits for the
page-load offers, capped by `target.flickerTimeout` (1000 ms). When consent is required, Target starts only after consent
and does not hold first paint. *Decided by:* user. *Status:* built on `aem-coder-branch` only (`1958509`, `138d4af`);
ported in Martech 3/4. *Source:* `.ema/plan.md` §3 and `.ema/design.md` §5 on that branch; MIGRATION.md 2026-10-14.

**D-046 — Fundraise Up on interaction; donation analytics from code (2026-09-27).** *Why:* loaded at ~3 s in the delayed
phase, the widget's third-party cookies and CPU fell inside Lighthouse runs. Moving it to first interaction took standard
mobile 67 → 96 (Best Practices 61 → 100, localhost; `c98fe46`). The 8 s fallback and the `pointermove` trigger were then
dropped, because Lighthouse runs outlast the timer and Chrome fires synthetic mouse moves (`daff30e`). Triggers are
`pointerdown` / `keydown` / `touchstart` / `wheel` / `scroll`, or at once with `?form=`; `donate-embed` still loads the
widget at once. Trade-off: the floating Donate tab appears only after the first interaction, but Donate links still work.
`checkoutOpen` / `donationComplete` become `s.tl` beacons from a `donate-beacons` table, so analytics no longer depend on
Launch load order. *Decided by:* user + agent (loading), user (analytics). *Status:* `aem-coder-branch` only; ported in
Martech 4/4. *Source:* `.ema/plan.md` §3, `.ema/design.md` §4, §8 on that branch.

**D-047 — No consent gate for ustafoundation (2026-09-27).** *Why:* the site has no consent requirement. Consent stays a
per-site setting because other sites will share the code (D-012). The same call was made earlier in `57906f3`
(2026-09-21, `feature/adobeAnalytics` only). *Note:* on `develop` a missing or invalid `consentRequired` row counts as
required (D-067), so the foundation `eager` tab must say `false`. Branch `one-trust` wires OneTrust for ustafoundation
and forces `consentRequired: true` for testing; confirm or supersede this entry before that branch merges. *Decided by:*
user. *Source:* `.ema/plan.md` §3 and `.ema/implementation.md` §2 on `aem-coder-branch`; MIGRATION.md 2026-09-27.

**D-048 — Martech config is an authored sheet (2026-09-28).** *Why:* admins change vendor settings without a code deploy.
The DA org/site config can be read only through the admin API (IMS token) and holds the `permissions` sheet with
e-mails, so the public site cannot and should not read it. The path and tabs later changed with D-015. *Decided by:* user
(`.ema/plan.md`). *Source:* MIGRATION.md 2026-09-28.

**D-049 — Admin-only martech sheet (2026-09-28).** Martech admins write, all other authors read. The rules are in the DA
**org** config, on the exact path with `.json` (`/<site>/configs/site-config.json`) or a folder rule
`/<site>/configs/+**`. Per identity the longest rule wins, so every non-admin author needs the read row. *Why:* prevent
accidental martech changes. *Decided by:* user (`.ema/plan.md`). *Source:* `971acbe` (`aem-coder-branch` only);
MIGRATION.md 2026-09-28; docs/MARTECH.md §1 Permissions.

**D-052 — Client-side A4T (2026-10-01).** The at.js payload goes to `window.targetA4TPayload`, then to the Launch page
view as context data `a4t.payload`, then to an Analytics processing rule; if the page view went out without it, one
backup link hit is sent (`scripts/target-a4t.js`). `VisitorAPI.min.js` and the server mode stay until client mode is
proven with a live activity. *Why:* AppMeasurement 2.27.0 drops `s.tnta`, and a direct demdex call cannot produce a
matching `sdid`; VisitorAPI costs 0.65–1 s of mobile LCP, client mode about nothing. A4T needs Target and Analytics in
the same Adobe org. *Decided by:* user. *Status:* `aem-coder-branch` only (`a227503`). *Source:* `.ema/plan.md` §3,
`.ema/design.md` §6 on that branch.

**D-057 — Data layer: `window.dataLayer`, not ACDL (2026-10-06).** *Why:* GTM and a Meta-Pixel-style vendor are planned,
and `gtm.js` reads `window.dataLayer` natively, so there is no second data layer to keep in sync; plain `dataLayer` gets a
small first-party listener wrapper instead of a vendored library. Supersedes the 2026-10-05 Adobe Client Data Layer
attempt on `feature/data-layer`. *Decided by:* user ("Explicit user decision"). *Status:* `feature/data-layer-1` only
(`e4b589e`), built on the pre-restructure config. *Source:* MIGRATION.md entry and `scripts/data-layer.js` on that branch.

**D-060 — No OneTrust auto-block (2026-10-07).** OneTrust loads `otSDKStub.js` + `OptanonWrapper` from site code and
gates each vendor on `OnetrustActiveGroups`. *Why:* auto-block only works as the first synchronous script in `<head>`,
and `head.html` must not be modified; the CSP (`'strict-dynamic'`) only runs scripts injected by the nonce'd modules, so
site code can check consent before each vendor loads. Add `OtAutoBlock.js` only if authors paste third-party embeds into
content. *Decided by:* n/d (committed by Vishal90124). *Status:* branch `one-trust` only. *Source:* `5b380df`, `9267180`
(`docs/otautoblock.md` §7) on that branch.

**D-065 — Roles, not e-mails (2026-10-14).** When the martech history moved from `aem-coder-branch` into MIGRATION.md,
people's e-mails were replaced by roles (e.g. "the 2 martech admins"); the real permission rows stay in the DA org config.
*Watch:* the unmerged branches `one-trust` (its MIGRATION.md 2026-09-28 permissions row) and `aem-coder-branch`
(`.ema/plan.md`) still list e-mail handles; apply the same replacement before any merge. *Decided by:* n/d. *Source:*
`2cb2e68` (on `develop`).

**D-066 — OneTrust categories follow usta.com (2026-10-14).** usta.com's Launch tag is released only when Performance
(C0002), Targeting (C0004) and Social (C0005) are all on, so Analytics, Hotjar and Target follow the same rule. This
replaces the branch's 2026-10-07 mapping (C0002 → Launch, C0004 → at.js). To add a vendor, add one entry to
`scripts/consent-vendors.js`. On request, cookies of denied vendors are no longer deleted (the code is commented out);
scripts still do not load without consent. *Decided by:* n/d (committed by Vishal90124). *Status:* branch `one-trust`
only. *Source:* `scripts/consent-vendors.js` (`9267180`, `ba99676`), its MIGRATION.md 2026-10-07 and 2026-10-14,
`docs/usta-consent-usta-com.xlsx`.

**D-067 — `consentRequired` fails closed (2026-10-14, Martech 1/4).** `isConsentRequired()` in `scripts/site-config.js`
is the only reader of `consentRequired` (eager tab). A missing row or any value other than `true`/`false` warns once and
counts as required. This reverses the earlier behaviour, where only `true` required consent and a missing row meant not
required (PR #6's `consent-check.js`; `aem-coder-branch` also defaulted to `false`). *Why:* n/d. *Decided by:* n/d.
*Source:* `2e8c8f0` (on `develop`); docs/MARTECH.md §1.

**D-068 — Script rows and modules (2026-10-14, Martech 1/4 and PR #14).** The loader injects a plain async script (e.g.
`script.launch`) unless the name is in `MODULES` in `scripts/martech/loader.js`. Hotjar needs a module because its script
throws `_hjSettings is not defined` without the snippet's globals; `hotjar.js` sets `_hjSettings` and the `hj()` queue
from the URL, rejects any other URL form and skips if Hotjar is already on the page. This replaced the `hotjarId` /
`hotjarHostUrl` / `hotjarVersion` rows and `scripts/hotjar-router.js` (PR #6, first named `analytics-router.js`). Hotjar
comes from the site config only; the Hotjar rule in USTA's Launch library is to be removed. Kill switch: blank the row.
*Decided by:* n/d (row/module design); user (Hotjar only from the sheet, 2026-10-07). *Source:* `7e3c377`, `b6236c7`
(on `develop`); docs/MARTECH.md §1–2, §4.

**D-069 — Martech moves over in four PRs (2026-10-14).** `aem-coder-branch` is not merged as is. Each vendor is rebuilt
on the per-phase config and loader (D-015), one per PR: Analytics → Hotjar → Target → Fundraise Up. 1/4 (`2e8c8f0`,
`7e3c377`, `2cb2e68`) and 2/4 (PR #14, `b6236c7`) are on `develop`; 3/4 Target and 4/4 Fundraise Up remain. *Decided
by:* n/d. *Source:* MIGRATION.md 2026-10-14 (Martech restructure 1/4).
*Correction (2026-10-16):* 1/4 was pushed straight to `develop` with no PR (GitHub lists no PR for its three commits);
only 2/4 went through a PR (#14).

#### Added by the completeness pass (2026-10-15)

**D-070 — Hero photos stay CSS backgrounds, with a hidden label and an LCP preload (2026-09-09 / 2026-09-10).** As on
the source, banner and text-up heroes paint the authored photo as a CSS background, not an `<img>`. `hero.js` adds a
visually hidden `<span class="hero-a11y-img" role="img" aria-label>`, labelled from the authored alt; an empty alt keeps
the photo decorative. The role is never put on the block itself, because the block holds the H1 and the CTA links (axe
`nested-interactive`). For LCP, `preloadHeroImage()` adds `<link rel=preload as=image fetchpriority=high>`, and
`heroRenditionWidth()` sizes the rendition to viewport × DPR (buckets 750 / 1000 / 1600 / 2000; WebP since 2026-10-07).
*Why:* source parity, a11y, mobile LCP. *Decided by:* n/d (the log says "Per request"). *Source:* MIGRATION.md
2026-09-09 and both 2026-09-10 entries; `blocks/hero/hero.js`.

**D-071 — CTA buttons are added on top of the boilerplate buttons, not in place of them (2026-09-29).** Plain bold,
italic and bold + italic links keep the boilerplate `.button.primary` / `.secondary` / `.accent` rules. The CTA looks use
a separate `a.cta-button` class (mark → class map `CTA_BUTTON_STYLES` in `scripts/scripts.js`), so `.button` rules,
theme overrides and block resets cannot reach them. On 2026-10-10 they moved to their own stylesheet driven by `--cta-*`
custom properties (now `styles/foundation-buttons.css`). A text-link "READ MORE" CTA style was dropped: it is a link
style, and the cards that use it style it themselves. *Why:* a first pass restyled the existing buttons globally; the
user asked to keep them and add new options, so it was reverted. *Decided by:* user. *Source:* MIGRATION.md 2026-09-29,
2026-10-10.

**D-072 — `compact-headings` section style (n/d; working tree, not committed).** Authors opt a section out of the
site-wide 24 px rhythm (D-059) with `Style | compact-headings`, combinable with other styles (e.g.
`center, medium, compact-headings`). Inside such a section a heading and the paragraph after it have no gap (default
content and columns text cells); a heading that ends the default content sits straight on the block below; a paragraph
that ends in bold + underlined text (a "heading line") has no gap below it. It began as a news-only heading-line rule in
`templates/news/news.css` (`dd654a3`, 2026-10-07, on `develop` and `main`); the uncommitted working tree moves it to
`styles/styles.css` for every page and adds the heading rules. *Why:* on the source these gaps are 0 px — the known
deviation D-059 accepted. D-059 was decided with no opt-in style (`spaced` was removed), so this adds a per-section
opt-out. *Decided by:* n/d. *Status:* not committed, not in MIGRATION.md, and no importer emits it; pages need the style
set in DA. *Source:* `styles/styles.css` (working tree); MIGRATION.md 2026-10-07.
*Update (2026-10-16):* logged in MIGRATION.md 2026-10-16 and committed in the `feature/codesyncandcodebaseswitch` PR to `develop`; on `develop` since PR #15 (`2860acd`).

#### Accessibility

**D-053 — Accepted a11y exceptions for parity (n/d).** (1) axe `color-contrast` is off in `tests/a11y/a11y.config.js`:
the CTA/nav/footer palette (brand blue `#0357b8`, brand orange) is copied from the live site and some pairs fall just
under 4.5:1 — "kept for visual parity by product decision; revisit as a separate brand-a11y task" (already present in
`ce9ed31`, 2026-09-18). (2) Third-party iframes (YouTube, youtube-nocookie, youtu.be, Vimeo, and Instagram since
2026-09-05) are in `excludeSelectors`, because their vendor DOM cannot be fixed; our wrapper and the iframe `title` are
still scanned. (3) Tweet inline links stay colour-only like the source (underline removed on request; EDS-51 also removed
the hover underline). `link-in-text-block` is **not** disabled, so `test:a11y` fails on news pages with a tweet. *Why:*
lift-and-shift parity (D-006). *Decided by:* product (contrast; name n/d); "on request" (tweet links); n/d (iframes).
*Source:* `tests/a11y/a11y.config.js`; MIGRATION.md 2026-09-05, 2026-10-01, 2026-10-12. Heading-level deviations are
still open (PRD §12).

---

## Superseded or reverted

| ID | What | Replaced by |
|---|---|---|
| 2026-09-28 rule | Every link opens in a new tab | D-016 |
| D-013 (embed part) | Inline Fundraise Up `.embed` variant | `?form=` overlay (same entry) |
| D-013 (inline part) | No inline Fundraise Up form; dedicate name cannot round-trip | D-040 (`donate-embed`) |
| `custom-form-donate` block | Hand-built donation form | D-040 |
| D-014 (env rules) | Host-based environment rules, `.production` / `.development` lookup, `getMartechConfig()` | D-015 |
| 2026-09-29 rule (PR #6, `feature/eds-5`) | One `/site-config.json` with env-suffixed keys; environment chosen by hostname (`isProdEnvironment`); no `consentRequired` row meant no consent needed | D-015, D-067 |
| 2026-09-27 rule (`aem-coder-branch` only) | `scripts/analytics-config.js` host → environment table | D-015 |
| 2026-09-28 rule (user) | `SITES` code defaults kept as a fallback under the `/site-config` sheet | D-014 (no code defaults) |
| `hotjarId` / `hotjarHostUrl` / `hotjarVersion` rows; `scripts/hotjar-router.js` | Hotjar configured by ID rows and a router script | D-068 |
| 2 s delayed timer (`95f6fea`, `aem-coder-branch`) | Delayed phase at 2 s | D-039 (3 s) |
| 2026-10-05 attempt (`feature/data-layer`) | Adobe Client Data Layer (`window.adobeDataLayer`, vendored ACDL 3.0.1) | D-057 |
| 2026-10-07 mapping (branch `one-trust`) | C0002 → Launch, C0004 → at.js | D-066 |
| Viewport-scaling mobile gutters (15 px, 2026-09-03; 31 px padding, reverted) | Content width scaled with the phone | D-026 |
| 2026-09-04 rule | Widget-card reproductions use Graphik, never the widget's font | D-061 |
| `float-left` section style (2026-09-06) | Block floated beside text in an 810 px container | D-027 |
| `yellow-center-intro` section style | One style mixing a colour and a layout | D-024 |
| `columns (statement)` variant | Mission Statement as a block | D-024 (default content + `center, narrow`) |
| `body.general` layout scope (2026-09-15, reverted) | Layout rules scoped to the page theme | D-033 |
| `spaced` opt-in section style (2026-10-07) | 24 px rhythm only where a section opts in | D-059 |
| 2026-09-07 rule | News Publication Date = sitemap `<lastmod>` for every article | D-042 |
| 2026-09-10 rule | `News Tags` only on the 12 related-card articles | D-042 |
| 2026-09-10 facade (homepage video) | Click-to-load YouTube poster in `columns (feature)` | D-055 |
| 2026-10-06 audit (same day) | Decorative Related Articles thumbnails (`alt=""`, `aria-hidden`) | D-056 |
| `style="usta"` + size options | One USTA style with height / width / font-size / shape / padding / disabled options | D-062 |
| 2026-10-11 in-code list | `USTA_ICONS` allow-list in `scripts.js` and the panel | D-063 |
| D-076 | Codebase switch panel with a fixed target URL (`…/foundation-dev/index`) | D-077 |
| D-079 (layout, unlisted value) | Equal-width pickers in one column; "Select content" prompt for an unlisted open site | D-080 |
| D-078 (value rule) | Sheet values accepted when they match `^[a-z0-9-]+$` | D-082 (single hyphens, no leading/trailing `-`) |
