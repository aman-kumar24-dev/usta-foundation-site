# PRD — USTA Edge Delivery Platform (USTA Foundation + USTA.com)

| | |
|---|---|
| **Status** | Draft v0.3. v0.1 was reconstructed from the repo docs (README, AGENTS.md, MIGRATION.md, `docs/`, `tools/quality/`). v0.2 (2026-10-15) adds what a full read of MIGRATION.md, the git history of `develop`/`main`, the unmerged branches and the code itself turned up. v0.3 (2026-10-16) adds the risks and questions found while tracing [flow.md](flow.md). Not yet reviewed by the business. |
| **Audience** | Developers and AI coding agents who build on this repo. |
| **Last updated** | 2026-10-16 |
| **Conventions** | Status tags: **Done**, **In progress**, **Planned**, **TBD** (the repo does not say; needs an owner's answer). "Branch only" means the code exists only on an unmerged branch (§8.7), not on `develop`. Every requirement cites its source. Nothing here overrides [AGENTS.md](../AGENTS.md); where they differ, AGENTS.md wins. Decisions are in [decision.md](decision.md) (`D-xxx`); end-to-end flows in [flow.md](flow.md). |

> **How to read this.** Sections 1–3 are the why and the scope. Sections 4–7 are the requirements, each with a
> status. Sections 8–10 are how work is delivered. Sections 11–12 are the roadmap, risks and the questions that
> still need a human answer. Detail lives in the linked documents; this file does not copy it.

---

## 1. Overview and goals

**Product.** One codebase (kept in more than one Git repository) that renders two public websites on
[AEM Edge Delivery Services](https://www.aem.live/): **USTA Foundation** (`ustafoundation.com`, the canonical,
first site) and **USTA.com** (`usta.com`, follows). Content is authored in DA (da.live) and served from `aem.live`;
this repo holds the code (blocks, scripts, styles) that decorates it. [README](../README.md)

**Approach: lift-and-shift.** Migrate the existing AEM-classic / Bootstrap 3 sites quickly with visual and
functional parity on mobile, tablet and desktop. Adopt the source site's breakpoints, grid and typography rather
than redesigning. [AGENTS.md](../AGENTS.md) (Breakpoint, Grid, Typography rules), [MIGRATION.md](../MIGRATION.md) §1, D-006

**Goals**

| # | Goal | Measure |
|---|---|---|
| G1 | Foundation site on EDS at visual + functional parity | Every template (§4.1) imported and visually verified at 375 / 768 / 992 / 1200 and wide desktop. Target for "done": **TBD** (business sign-off in UAT). |
| G2 | One codebase serves both sites | USTA.com runs from the same repo via the repoless setup (§8.3), with its own content source and martech config. |
| G3 | Authors work without developers | Authors build pages from blocks, variants and section styles in DA, using the buttons panel and block library (§4.3). |
| G4 | Performance | PageSpeed Insights target **100** on feature previews. [AGENTS.md](../AGENTS.md) (Publishing Process). Status: desktop 99, CLS 0 (2026-09-07); home desktop 100, mobile 93 before the hero-rendition fix (2026-09-10); news page mobile Core Web Vitals all green, Speed Index 4.9 s left as is because Fundraise Up is deferred on purpose (2026-09-24, D-039). "Minify" and "cache lifetime" flags are platform-controlled on `aem.page`. Tags (Launch) dropped local Lighthouse Best Practices to ~61 (2026-09-27). No later score is recorded; re-measure per template. [MIGRATION.md 2026-09-07 → 09-27] |
| G5 | Accessibility | WCAG 2.1 AA; `npm run test:a11y` clean of critical/serious axe violations, apart from the exceptions listed in N5 and D-053. |
| G6 | Safe, repeatable releases | Every change passes the quality gate (§7) and moves `feature/*` → `develop` → `uat` → `main` by PR only. |

**Non-goals.** Redesign of either site; a CMS or framework change; any build step or runtime dependency (§6).

---

## 2. Scope

| Site | Content source | Status |
|---|---|---|
| `foundation-dev` | DA, dev content | **In progress** — only site with content today. [README](../README.md) The DA content is mirrored from Adobe's DA (`aemdemos/foundation-usta`) with `da:sync` (D-050). |
| `foundation-com` | DA, prod content | **Planned** — no prod content yet. |
| `usta-dev` | DA, dev content | **Planned** — no content yet. Only the USTA button system exists (§4.3). |
| `usta-com` | DA, prod content | **Planned**. |

**In scope:** page templates, blocks, section styles, global design system, importers, martech loader and
consent, authoring tools (buttons panel, block library), quality tooling, release process.

**Out of scope (this PRD):** content writing; the legal/licensing decisions in §11; Akamai configuration
(only the dependency is recorded); the Reactions widget (removed at the customer's request, D-051). **usta.com page
inventory is TBD**: the crawl found ~12,411 sitemap URLs and ~3,088 core pages ([MIGRATION.md](../MIGRATION.md) §3
Buttons item 9), but no template catalog or migration scope exists for it yet (§12 Q2).

---

## 3. Users

| Persona | Needs | Served by |
|---|---|---|
| **Visitor** | Fast, accessible pages that look like today's sites; donation flows that work | §4, §5, §6 |
| **Content author** (DA) | Predictable blocks and variants, a buttons panel, a block library | §4.2, §4.3 |
| **Martech admin** | Turn vendors on/off and change IDs without a code release | §4.6 (R-M4) |
| **Developer / AI agent** | Clear rules, deterministic checks, a log of past decisions | §5–§7, [skills/README.md](../skills/README.md), [decision.md](decision.md) |
| **Lead** | Controlled promotion to `uat` and `main` | §8.1 |

---

## 4. Functional requirements

### 4.1 Page templates (Foundation)

Source: [MIGRATION.md](../MIGRATION.md) §2a (scoped 2026-09-05: **86 content pages + 21 documents**, 8 templates; 84 % of pages
are news detail). Importer scripts are in `tools/importer/` with known-good backups in `tools/importer/backups/`
(state: R-I9).

| ID | Template | Representative path | Pages | Status | Notes |
|---|---|---|---:|---|---|
| T0 | Home | `/en/home.html` | 1 | **Done** (per §2a; QA fixes continued to 2026-10-13) | `import-home-page` (parsers in `tools/importer/parsers/`): `hero (banner)`, `columns (stats)`, the mission band as default content (no block; the importer sets `center, narrow`, the content was later changed to `center, medium`), `columns (feature)` video + collage, `cards (support)`. `banner-stats-grid` is on Our Impact (T3), not Home. No backup in `tools/importer/backups/`. The live `/` is the DA `index` doc (R-T2). Possibly missing work: §11 (homepage patch). |
| T1 | News detail | `/en/home/news/*` | 73 | **Done (imported)** — QA ongoing | 72 bulk-imported 2026-09-07 (66 + 6 samples), plus the Career Excellence Week article (published on the source after the export), imported 2026-09-22. The 2026-10-06 and 2026-10-13 audits cover all 73 sitemap URLs. `templates/news/` holds the template CSS/JS; the article column is 328/708 below 1200. `njtl-essay-grant-recipients-2020` holds the Evert "Rally to Rebuild" content, because the source URL 301-redirects there (§12 Q19). Open per-block gaps (MIGRATION.md 2026-10-12/13): 12 articles whose source columns stay side by side at 768; the split-left tweet section is stacked at 768–991 on the source; uneven source columns on `mississippi-njtl-…` and `kathleen-wu-…`. Related Articles: R-T3. §2a still says "needs importer": **stale**. |
| T2 | News listing | `/en/home/news.html` | 1 | **Done (blank by design)**; verify on the dev site | The source page is empty (no H1, no feed), so `import-news-listing-v1` imports only metadata (Title "News", Theme general); backup in `tools/importer/backups/news-listing/` (D-034). Excluded from `news-index.json`. `templates/news/news-sort.js` is the T1 Related Articles helper, not part of this page. |
| T3 | Section landings | `/en/home/{who-we-are,what-we-do,our-impact,get-involved}.html` | 4 | **Done (imported 2026-09-08)**; QA ongoing | One importer each (D-035), with backups. `import-general-v1` (who-we-are): `hero (text-up)`, `cards (tiles)`, `center, medium` / `center, wide`, `section-yellow`. `import-what-we-do-v1` and `import-get-involved-v1`: `hero (text-up)`, `cards (content)`. `import-our-impact-v1`: `hero (banner, medium)`, `banner-stats-grid`, `cards (stats)`. The MIGRATION.md "HANDOFF — who-we-are" block is **stale**: rounds 4–9 (2026-09-08) found its "not deployed" blocker was a measurement error and closed its items. |
| T4 | Leadership & staff | `/en/home/who-we-are/leadership-and-staff.html` | 1 | **Done (imported 2026-09-08)**; QA ongoing | `import-leadership-v1` (84.9 %): `toc-profile` (Staff / Board tabs, `#tab=` deep links) + `cards (profile)` + `table (directory)`; `Theme: leadership`. The Board leader cards are authored as `cards (profile, bio)` (2026-10-01) but the importer still emits `cards (profile)`. After any re-import, re-rasterize the two SVG-wrapped headshots to JPEG before DA publish (backup manifest). Open: the Board label `<h3>` drifts in `check:typography` (§12 Q22); the "Officers and Directors" label is a bold paragraph, not the blue bar; Board tab gaps (≈152 vs 40 px @1200 after the card row; tab → heading 62/78 vs 70/86). |
| T5 | Financials | `/en/home/who-we-are/financials.html` | 1 | **Done** (imported and published 2026-09-08) | All default content (`import-financials-v1`): 20 PDFs (13 annual reports, 4 audited statements, 3 IRS 990), authored as `ul/li` links so they stay plain links. Localized by `tools/assets/localize-docs.mjs`, live on DA. The 2024 annual report was compressed 61 MB → 3 MB to fit DA's 20 MB PDF cap. (§2a said 21 PDFs; the importer and DA hold 20.) |
| T6 | Special funds / campaign | `/en/home/get-involved/special-funds`, `…/special-funds/chris-evert-50th-anniversary`, `/en/home/get-involved/young-professional-initiative`, `/en/home/what-we-do/college-scholarship-opportunities` | 4 | **Done (imported 2026-09-08)**; QA ongoing | One importer each, content hard-wired. `import-special-funds-v1`: `hero (text-up)`, `cards (expand)` from the approved block sample (the source cards are cross-origin Fundraise Up iframes). `import-chris-evert-v1`: `quote` + `donate-embed` in a `split-even` section, plus `split-5-6` (D-054). `import-ypi-v1`: `hero (text-up, medium)`, `quote (image)`. `import-college-scholarships-v1`: `hero (text-up)`, `cards (content)`. No `table` (§2a listed one). Fund CTAs are Fundraise Up deep links (R-D1). |
| T7 | 404 | `/en/home/404.html` | 1 | **In progress** | The `hero (error)` variant is built and parity-checked (2026-09-05; sample `/drafts/block-samples/hero-error`). The repo `404.html`, which aem.live serves for unknown URLs, is still the unchanged boilerplate ("Page Not Found", "Go home"; only commit `ce9ed31`), and its own CSP lacks `frame-src` and Trusted Types (N10). No importer; the only template not migrated. **TBD:** make `404.html` match the source. |

> **Requirement R-T1.** Per-template status above must be re-verified against the live dev-site pages before
> the PRD is reviewed. The ✅/🟡 marks in MIGRATION.md §2a pre-date later work. VALIDATION.md (2026-09-08) audited 84
> published pages (12 non-news + 72 news, i.e. the EDS sitemap's 86 entries minus the nav/footer fragments); it did not
> include 404 or the Career Excellence article.

**R-T2. Homepage is two DA docs.** The live homepage at `/` is the DA `index` doc, a copy of `en/home` (EDS serves an
`index` doc at its folder root; `/index` returns 404). Make every homepage content change in **both** docs, and when
copying between them point images at the published `…/en/home/media_<hash>` renditions, not `/media-da/` staging paths.
Risk: the copies drift (e.g. on `/` the first strip is authored as raw `#e2f7ff` instead of the token, so its spacing is
off; `/en/home` is correct). [MIGRATION.md 2026-09-09, 2026-09-14, 2026-10-02]

**R-T3. Related Articles (Done).** Every page with `Template = news` ends with a Related Articles feed, built at runtime by
`templates/news/news.js` from `/news-index.json` (R-Q1) as a `cards (news)` block — a template feature, not a block
(D-041). It attaches to the section styled `related-articles`, else to a new section at the end of `main`. Page metadata:
`List From` = `children` (default, whole news index) | `tags` (articles sharing a `News Tags` leaf; empty tags → no feed)
| `static` (the paths in `Pages`); `Sort Order` = `desc` (default) | `asc`; `Max Items`, capped at 3 (D-018). The current
page is always excluded. Sort key: `Publication Date`, else the index `lastModified`. Card title: `Related Title`, else
the title. Image alt `Visit the <title> page`, hover title = index `imagealt` (D-056). Known gaps: the "Related Articles"
heading and "Read More" are hard-coded (N7); selection and count differ from the source (§12 Q16); the importer does not
emit the feed metadata (§11). Spec: [templates/news/RELATED-ARTICLES.md](../templates/news/RELATED-ARTICLES.md).

**Acceptance (every template):** imported via the profile-driven importer (never hand-built content, per the
Content-Import Rule); visually matches the source at all breakpoints; passes the gate in §7; logged in MIGRATION.md.

### 4.2 Blocks, variants and section styles

Existing blocks (`blocks/`). Each block's authoring contract is in its JS header comment. Each block family is one base
block plus variants (D-023).

| Block | Purpose and variants |
|---|---|
| `banner-stats-grid` | Heading, featured stat, 2×2 number/label grid (Our Impact) |
| `cards` | `content` (default), `expand` (special funds: chevron shows the description; a click anywhere on the card opens the 4th-cell DONATE link), `news` (Related Articles; an empty image cell keeps a blank 2:1 area), `profile` (+ `bio`), `stats`, `support`, `tiles`. Profile cards are equal height per row (D-029) |
| `columns` | Default image + text (image + caption → `<figure>`, either side), `feature` (video / collage; real YouTube player, D-055), `stats`, `profile` (CSS only). `statement` was removed on 2026-09-05 (D-024) |
| `donate-embed` | Fundraise Up inline form; one cell = the element ID (R-D2) |
| `embed-instagram` | Instagram post beside text (no consent gate, D-021) |
| `header` / `footer` | From `/nav`, `/footer`; the header also builds the breadcrumb (§4.7) |
| `fragment` | Includes `/fragments/…` (also auto-blocked from links) |
| `hero` | `banner` (default, 40 % overlay), `banner, medium` (our-impact), `text-up` (+ `medium` for YPI; `tall` kept but unused since 2026-10-02), `error` (404). The photo is a CSS background with a hidden `role=img` label and an LCP preload (D-070) |
| `library-metadata` | **Dead code:** `tools/da-library-preview/` removes its tables before decoration, so it never loads. Delete once confirmed in Experience Workspace (MIGRATION.md 2026-10-10) |
| `quote` | Default, `image`, `tweet` (static; no Twitter script) |
| `social` | Share bar: default left, `center`, `right` (always centred below 768) |
| `spacer` | `desktop` (≥ 1200) / `tablet` (≥ 992) / `mobile` heights + `color` (CSS colour or token name) |
| `table` | Default (semantic `<table>`; grouped 2-column data rebuilt column-major; all single-cell rows → list), `directory` (name columns with dividers from 768) |
| `toc-profile` | Tab row; rows `label \| slug`; shows one `profile-anchor` section at a time; `#tab=<key>` deep links (D-028) |
| `video-embed` | YouTube; click-to-load when a Row 2 consent message is authored |
| `widget` | Boilerplate loader for `/widgets/<path>/<name>.{html,css,js}`; **unused** (no `widgets/` folder) |

All **Built**; per-block acceptance status **TBD**. Parity fixes are recorded per block in the MIGRATION.md log.

**Section styles** (Section Metadata `Style`; composable and block-agnostic, D-024; all in `styles/styles.css`):

- **Layout:** `center` (centres all default content), `center-intro` (centres only the leading intro), `narrow` (810 from
  768), `medium` (708 / 772 / 970), `wide` (708 / 902 / 1170), `map-wide` (near-full-viewport, with `center`),
  `split-left` / `split-right` (block beside text; two equal columns from 768, D-027), `split-even` (two blocks; stacked
  below 992, equal columns from 992), `split-5-6` (text 5 + image 6 of 12 columns from 992, D-054).
- **Colour:** `section-yellow` (taller from 992 when it leads with columns), `section-blue` (legacy alias `highlight`),
  `dark`, `light`, plus the DA `background` options `section-blue-bg`, `section-yellow-bg`, `sage-grey-bg`,
  `pale-grey-bg` (applied by `applySectionBackgrounds()`, §4.3).
- **Rhythm:** `compact-headings` (opt-out of the 24 px rhythm; moved from `templates/news/news.css` to
  `styles.css`, on `develop` since PR #15 (`2860acd`), D-072).
- **Tabs:** `profile-anchor` sections are the panels for `toc-profile`.
- **Not built:** the generic `full-width` / `full-width-left` / `full-width-right` styles (§5 Full-bleed row).

- **R-B1.** New UI is a *variant* or *section style* before it is a new block; a new block only for a genuinely new
  authoring structure. Blocks that duplicate another block or only wrap default content are removed (D-022).
  [skills/eds-content-modeling](../skills/eds-content-modeling/SKILL.md)
- **R-B2.** Container patterns that must wrap arbitrary content (tabs, accordions, carousels) are section styles, not
  blocks. For tabs the tab row is a block (`toc-profile`) and the panels are sections (D-028).
  [skills/container-block-vs-section-style](../skills/container-block-vs-section-style/SKILL.md)
- **R-B3.** Each block's authoring structure is a contract, documented before coding and handled gracefully when
  authors omit or add fields. [AGENTS.md](../AGENTS.md) (Blocks)
- **R-B4 (Answered).** The three custom blocks MIGRATION.md names are retired. `custom-form-donate` (hand-built form) was
  replaced by `donate-embed` on 2026-09-15, before this repo's first commit (D-040). `custom-widget-reactions` was
  removed on 2026-09-30 at the customer's request; **Reactions are out of scope** (D-051). `custom-content-related-articles`
  was retired on 2026-10-06 as a duplicate of `cards (news)` (D-041). Both remaining folders and the six emoji icons
  were deleted by PR #8 (`dd654a3`). Leftovers: `tests/a11y/a11y.config.js` still lists the deleted samples
  `custom-content-related-articles`, `tabs` and `downloads`; the DA samples and library entries are an author step
  (§12 Q18).
- **R-B5. Samples.** Every authorable block and variant has a sample page at `/drafts/block-samples/<name>`, and section
  styles at `/drafts/sections-samples/section-<name>` (DA content, not in git). Scaffold: spacer → intro `<h1>`, notes and
  Source URL → spacer → block → spacer → metadata Title (an `h2` intro left pages with an empty `<title>`, axe
  `document-title`). New samples are built by a sample importer (`tools/importer/import-sample-*.js`), not by hand.
  Every sample URL is listed in `tests/a11y/a11y.config.js` `urls[]`; remove the entry when a block is retired.
  [MIGRATION.md 2026-09-03, 2026-09-15, 2026-10-01, 2026-10-06]
- **R-B6.** Every content image is author-managed; only UI glyph SVGs live in code, in the one root `icons/` folder,
  resolved through `window.hlx.codeBasePath` (D-037, D-038).

### 4.3 Buttons and authoring tools

Source: [MIGRATION.md](../MIGRATION.md) §3 "Buttons (CTA)"; [tools/plugins/buttons/README.md](../tools/plugins/buttons/README.md).
The PR numbers #68–#70 in MIGRATION.md come from another repository that holds this codebase; on this `develop`/`main`
the code arrived with PR #9 (§8.6).

| Capability | Status |
|---|---|
| Foundation buttons: 5 styles (`styles/foundation-buttons.css`), a separate `a.cta-button` layer on top of the boilerplate buttons (D-071), authored `[style=…, color=…, text-color=…, new-tab=…]` options, link-target rules (internal same tab; external/files new tab; `#_blank` forces new tab, D-016) | **Done**: on `develop` and `main` since PR #9 (`e910fb9`, 2026-10-13, Adobe code drop) |
| Buttons panel for DA / Experience Workspace (`tools/plugins/buttons`) | **Done**: same PR #9 |
| Env selector panel for DA / Experience Workspace (`tools/plugins/env-selector`): pick the content (site) and the branch, **Go** reopens the page open in the canvas with them (R-A7, D-077 – D-079) | **In progress**: in the `feature/envselector` PR to `develop` (2026-10-16). The first version (codebase switch, D-076) is on `develop` since PR #15 (`2860acd`); not yet registered in the DA config |
| USTA button system: 28 styles / 68 designs / 85 icons (`styles/usta-buttons.css`, `icons/usta-buttons-icons/`), loaded only on pages with a `cta-usta*` link (`loadUstaButtonsCss()`); scope and naming per D-062, icon list in the DA sheet (D-063) | **Done (code):** on `develop` and `main` since PR #9. Validated 2026-10-11: all 68 designs vs usta.com; 86-page Foundation link regression with 0 differences; Foundation pages load only `foundation-buttons.css`. MIGRATION.md §3 "branch `usta-buttons`, not yet merged" is stale |
| USTA buttons in DA Layout view, `/.da/library/buttons` USTA rows, publishing sample pages | **Planned** (user-owned, outward-facing steps; the panel Insert/Update and USTA Layout preview are untested because they need a signed-in DA session) |
| DA block-library integration: (1) `tools/da-library-preview/` runs only on `/.da/library/*` pages; it removes `library-metadata` and start/end marker tables and frames each variant with its name (port of `aemdemos/patients-stryker#312`); (2) `applySectionBackgrounds()` reads `/.da/library/blocks.json` (options tab, key `background`, `name=#hex`) and adds the option name as a section class — a new option needs a `main .section.<name>` rule, and a rename needs code and DA sheet changed together; (3) `/.da/library/buttons` feeds the Buttons panel; (4) `?quick-edit` (Layout view) shows edited CTAs as styled buttons; `?dapreview` loads da.live's preview script | **Done** (code on `develop`/`main`: PR #4 and PR #9). **TBD:** confirm the 2026-09-29 rename to `section-blue-bg` / `section-yellow-bg` was made in the DA sheet |

- **R-A1.** `decorateButtons()` runs before block decoration so buttons work inside every block; block CSS must not
  restyle `.cta-button`.
- **R-A2. Buttons while editing in DA Layout view.** `previewEditingCtas()` (only with `?quick-edit`) styles a button being
  edited by setting `--cta-edit-*` variables and `.cta-edit-*` classes on the `.prosemirror-editor` wrapper only. Never
  modify anything inside `.ProseMirror`: DA saves those changes back to the document. A new or changed block needs no
  extra code as long as its CSS uses no ID selector and no `!important` on `p` / `a` font-size or colours; if a block
  conflicts, raise the central rule in `foundation-buttons.css`, never add per-block overrides. A new foundation style or
  mark must be added to the `.prosemirror-editor` selectors in `foundation-buttons.css` and to `EDITING_CTA` in
  `scripts.js`; USTA styles have their own `.cta-edit-usta*` rules. Test Layout from a pushed branch
  (`da.live/canvas?ref=<branch>`): `ref=local` renders unstyled, and without `?ref=` DA loads `main`. [MIGRATION.md §3
  item 7; buttons README §6]
- **R-A3. Buttons panel setup.** The panel is registered by hand, once per DA site (outward-facing): DA config →
  `library` → `Buttons` = `/tools/plugins/buttons/buttons.html` (relative, so `?ref=<branch>` loads the branch). An
  optional DA sheet `/.da/library/buttons` (saved, not published) configures it: its `presets` tab replaces the Foundation
  default designs (the USTA defaults are appended unless the sheet has its own `usta-…` rows), and each `options` key it
  lists (`color`, `text-color`, `icon`) replaces that default list. Without the sheet the panel shows its defaults and a
  note. The panel writes the authoring contract (marks or `[options]`, new tab as `#_blank`) and rejects `javascript:`,
  `data:` and `//host` URLs. The Buttons block-library entry stays alongside it (author choice). [MIGRATION.md §3 item 8;
  2026-10-10, 2026-10-11]
- **R-A4. CTA authoring limits.** Only a link that is the whole paragraph becomes a button. Links in list items or inside
  a sentence, image links, and links whose text is their URL (unless they carry options) stay links. `[style=…]` wins over
  the formatting mark; options make any standalone link a button; invalid colours are ignored (`CSS.supports`).
  `[new-tab="false"]` forces the same tab, even for an external link; a plain link has no same-tab override (no
  `#_self`). In `cards (expand)` the 4th cell is the DONATE bar, and a Columns image cell keeps only image + caption:
  put CTAs in the text cell. [MIGRATION.md §3 items 1, 2, 4; 2026-10-08, 2026-10-10]
- **R-A5. Pasted EDS media links become images (Done).** A pasted EDS media URL (`…/media_<hash>.jpg|jpeg|png|gif|webp`)
  on this origin, a relative path or `*.aem|hlx.page|live` becomes an optimized `<picture>` before block decoration
  (`buildImageLinks()`), also inside blocks. It must stand alone in its paragraph or cell, with an empty label or a URL
  as the label. Alt comes from the link `title`, else `alt=""`; for descriptive alt, insert a real image. Labelled links,
  links inside a sentence and non-EDS image URLs (source DAM, content.da.live) stay links. On `develop`/`main` since PR
  #8. [MIGRATION.md 2026-10-06]
- **R-A6. Tooltips.** Links carry no `title` tooltip, matching the source (EDS-51; the boilerplate
  `a.title = a.title || a.textContent` was removed from `decorateButtons()`). Images show their alt as a native hover
  tooltip site-wide (`decorateImageTooltips()`, D-064). **Done:** the tooltip code is
  on `develop` since PR #15 (`2860acd`), 2026-10-16. [MIGRATION.md 2026-10-01, 2026-10-13]
- **R-A7. Env selector panel (In progress).** An author reopens the page open in Experience Workspace with other content
  (a DA site) and/or another code branch: pick **Content** and **CodeBase** (the branch), select **Go**. Both lists come from the DA
  sheet `/.da/environments/config` of the open site (saved, not published; read through `admin.da.live`): tab `content`
  for the content, tab `code` for the branches; `title` is the option text, `value` the site or branch (values that are
  not a site/branch name, and repeated values, are skipped). Without the sheet, the branches fall back to the built-in
  `main`, `uat`, `develop` and the content to the open site (D-078, D-079). CodeBase is an editable combobox (D-082): the
  author can also type or paste any branch; it is written in host-name form (lowercase, other characters → `-`) and
  always shown on top, and a name that is not lowercase letters and digits with single hyphens, or makes
  `<branch>--<site>--<org>` longer than 63 characters, disables Go with a red message. The list has two labelled groups
  (D-083): "Environments" (the sheet's `code` tab) and "All branches", every code branch of the site from the EDS admin
  API (`GET https://api.aem.live/<org>/repos/<site>/code/` with the DA token; a not-canonical 403 is retried against the
  canonical site; cached 5 minutes), loaded in the background; typing narrows both groups. Without the API's list (no
  token, no permission, an error) the panel works from the `code` tab alone, as before. Go puts the content into the hash's site
  segment (`#/<org>/<site>/<path>`, split on `/`, second segment replaced) and the branch into `?ref=` (replaced, or added
  when the URL has none, which means `main`):
  `da.live/canvas?ref=feature-envselector#/aman-kumar24-dev/usta-foundation-site/en/home` with Foundation Dev + Develop →
  `da.live/canvas?ref=develop#/aman-kumar24-dev/foundation-dev/en/home`. The org and the page path are kept.
  The panel cannot read DA's URL (cross-origin iframe), so it rebuilds it from what DA sends (`hash`, else `org` / `repo`
  / `path`, and `ref`) and asks DA to navigate (SDK `setHref`, a relative `/canvas?ref=…#…`). Each list preselects the open
  value; one the sheet does not list (e.g. a feature branch) is added at the end of its list. The status line reads
  "Currently on {content} with {branch}" with a green dot; the two names are bold italic accent blue. Go is enabled only when both lists have a pick and at least one
  differs from what is open; it accepts only listed values and stays disabled outside DA. Layout (D-080, D-081): a
  Content card and a CodeBase card (label inside, above the value) and a round arrow Go button, at most 360 px wide; up
  to 576 px the cards stack, the same width, with Go beside the CodeBase card (DA's tools panel opens 400 px wide, so
  this is what authors see by default); from 577 px they sit in one row, 3:4. DA's panel header shows the title. In browsers with customizable selects the open list
  is a card with a highlighted, check-marked row; elsewhere the native list. The fallback branches, editor path and messages live in
  `env-selector.html`. Registered by hand per DA site (outward-facing): DA config → `library` → `Environment` =
  `/tools/plugins/env-selector/env-selector.html`; after a content switch the panel and its sheet come from the new
  site, so each listed site needs both. A relative path loads the panel from the `?ref=` branch, so it appears only on
  branches that have it (flow.md §5 Gotchas). Verified with a simulated DA host, not in a signed-in DA session.
  [MIGRATION.md 2026-10-16; D-077, D-078, D-079]

### 4.4 Content import and migration

- **R-I1.** Pages are imported by a **profile-driven, hash-free, selector-based importer built once per page
  template**, never per page; no hand-editing `content/` to create blocks. [skills/content-import](../skills/content-import/SKILL.md)
  *Deviation (D-035):* the single-page landings each have their own importer (`import-<page>-v1.js` + a backup), because
  each has a unique section sequence; they share only `transformers/ustafoundation-cleanup.js`, and most hard-wire their
  content. A shared importer is used where pages share a layout (news: 73 pages). The owner should confirm this
  exception; the rule still governs new work.
- **R-I2.** Per page: measure live DOM → profile → bundle → import → finalize assets (docs → `content/assets/docs/…`,
  images → `content/media-da/…`, doc links absolute) → verify → visual parity → back up the known-good script → log.
- **R-I3.** DA publishing is outward-facing and happens **only on request**.
- **R-I4.** Completeness below ~90 % is expected (e.g. hidden mobile/desktop duplicates); verify by eye.
- **R-I5 (Planned).** Add importer profiles for **usta.com** templates once its template catalog exists (§12).
- **R-I6. Importer rules learned on the fleet.** Importers read the live, post-JS DOM. (a) Match source components on
  static classes (`div.socialmediasharing`, `blockquote.twitter-tweet`, `iframe[src*="instagram.com/"]`), not on
  JS-injected labels. (b) Drop hidden duplicates: `.cmp-text` inside `aem-GridColumn--default--hide`, and zero-size
  tweet/Instagram copies (`isHiddenDup()`). (c) Put the page Metadata block in its own last section and find it with an
  exact match (`/^\s*metadata\s*$/i`). (d) Flatten nested layout tables after media pairing; never unwrap our own block
  tables. (e) When the parser cannot read the source (`<noscript>` card images, cross-origin Fundraise Up iframes, packed
  stats), hard-wire verified `/content/dam/…` paths or the approved sample in the script. (f) Each page importer embeds
  its own `PAGE_TEMPLATE`, and that copy is what the bundle uses (`page-templates.json` mirrors only `home-page`): edit
  the embedded copy, re-bundle, re-import. Fix the parser, not the content. [MIGRATION.md 2026-09-05 → 09-08]
- **R-I7. Assets and DA upload.** This repo's finalize-assets tools are `tools/assets/localize-assets.mjs` (images) and
  `tools/assets/localize-docs.mjs` (docs; `--base`). (a) Local page copies point at images only by `/media-da/…`: no
  source hotlinks and no `content.da.live` URLs (they 401 without a DA login); `media-da` is local staging. (b) Docs keep
  readable DAM sub-paths under `content/assets/docs/` and go to DA with the page. (c) DA rejects SVG content images (409)
  and PDFs over 20 MB (`AEM_BACKEND_PDF_TOO_BIG`; the guide says ~25 MB): rasterize SVG-wrapped photos and compress big
  PDFs (a re-import brings the SVGs back; see `tools/importer/backups/leadership/manifest.md`). (d) To add an image in DA,
  upload its bytes to the doc's shadow folder (`.{page}/media-…`) and reference it by `https://content.da.live/{org}/{repo}/…`;
  when cloning a page, point at the source page's published `media_<hash>` renditions. Doc links: §11 risk.
  [MIGRATION.md 2026-09-04, 09-08, 09-09, 09-23]
- **R-I8. Post-import fixes.** When a full importer re-run would overwrite later work, fix imported content with a
  targeted, idempotent script (`--dry-run`, backup first), not a hand edit; verify by undoing against the backup; change
  the importer in the same task. Examples: `remove-block.mjs` (2026-09-30), `staff-list-format.mjs`,
  `spacer-all-viewports.mjs` (2026-10-02). **TBD:** these `tools/content/*.mjs` scripts are not in this repo on any
  branch. [MIGRATION.md 2026-09-30, 2026-10-02]
- **R-I9. State of `tools/importer/`.** 13 page importers (12 `import-<name>-v1.js` plus `import-home-page.js`, each with a
  `.bundle.js`) and 3 sample importers. Every `urls-*.txt` holds one URL (`urls-news.txt` has only the Aerie sample;
  `urls-leadership.txt` exists only in its backup), so the 72-page news list is not in the repo. `page-templates.json`
  describes only `home-page`, with positional `:nth-of-type` selectors. Known-good backups exist for 12 importers (none
  for `home-page`; `news-listing` has no `manifest.md`). Reports are in `tools/importer/reports/`; the import output
  (`content/`) is not in the repo. **TBD:** commit the bulk URL lists and back up `home-page`.
- **R-I10. DA content mirror (Built, branch only).** Our DA content is mirrored
  from Adobe's DA `aemdemos/foundation-usta` with `npm run da:sync` (`tools/da-sync/`, D-050). It copies each file by DA
  source GET/POST (DA's copy API is same-org only), backs up the destination first, overwrites, never deletes, includes
  `/.da/library`, runs a bulk preview and never publishes; outside AEM Coder it needs `DA_TOKEN`. Synced pages' images
  still load from `content.da.live/aemdemos/foundation-usta/…`. Commits `b1771d1`, `e0cee4d` are on `aem-coder-branch`,
  not on `develop`/`main`. Last full sync 2026-09-28 (234 files; it overwrote 5 destination-only edits); Library sync
  2026-09-29 (24 files); on 2026-10-11 the source had 210 newer files and 33 the destination lacked. **TBD:** bring the
  tool to `develop`; decide when syncing stops (once authors edit our DA, a sync overwrites their work); decide whether
  images should stop depending on `aemdemos`.
- **R-I11 (Planned).** Imported pages carry Title metadata matching the live site's title, because Analytics `pageName`
  is built from `document.title` (who-we-are, what-we-do and special-funds still differ). [docs/MARTECH.md §3;
  MIGRATION.md 2026-09-27]
- **R-I12 (TBD). Tools needed to re-run the importers** that are not in this repo: the runner `run-bulk-import.js` ships
  with the external *excat* content-import skill (IMPORTING-GUIDE §0a); `npx esbuild` (not in `package.json`) rebuilds
  each `import-*.bundle.js` (then re-prepend `/* eslint-disable */`); the guide's `tools/assets/finalize-page.mjs`,
  `fetch-docs`, `rewrite-doc-links`, `rewrite-internal-links`, `fetch-page-images` were never committed. Record the excat
  skill's source and version (or vendor the runner), pin esbuild, and commit or locate the finalize scripts; until then
  R-I2 cannot be followed from a fresh clone. [skills/content-import/IMPORTING-GUIDE.md; `tools/importer/backups/news/manifest.md`]

News content rules: Publication Date and News Tags come from the source as in D-042; broken links that are also broken on
the source are kept (D-036).

### 4.5 Donations, embeds and media

- **R-D1.** Fund cards and the nav DONATE link carry `form=<code>` in a **full, path-bearing href** (e.g.
  `https://www.ustafoundation.com/en/home/get-involved/special-funds.html?form=<CODE>`), because DA publishing turns a
  query-only href into `/` (D-025). `scripts/donate.js` (`wireDonateTriggers()`) rewrites every `a[href*="form="]` to
  `<current path>?form=<code>`, loads the widget in the delayed phase (eagerly on pages with `donate-embed`) and opens
  that fund's overlay. Link-target rules skip these links (D-016). **Done.** [MIGRATION.md 2026-09-04]
- **R-D2.** Inline donation forms use the `donate-embed` block (D-040). Its one cell holds the Fundraise Up element ID as
  plain text (e.g. `XJYDXZPC` = CHRIS50), because publishing strips fragment-only (`#ID`) hrefs. The block re-creates the
  `#<ID>` anchor and loads Fundraise Up eagerly in the top page — no host iframe, the set-up that hit
  `frame-ancestors 'none'` on 2026-09-06 (D-013). It reserves the form height (716 px below 768, 698 px from 768) and
  relies on the Trusted Types frame policies in `scripts/donate.js` (§11 security risk). The native form has
  dedicate/honoree fields; the dedicate-name checkout round-trip is not re-tested. Used on
  `chris-evert-50th-anniversary`. **Done.** [MIGRATION.md 2026-09-15]
- **R-D3.** Embeds handle consent per block; none reads the site consent state (`window.hlx.consent` /
  `consentRequired`). `video-embed`: with a Row 2 consent message nothing loads from YouTube until the visitor activates
  its control; with no Row 2 the iframe renders directly. `embed-instagram`: loads Instagram's `embed.js` on decoration
  with no gate (2026-09-05, "per direction"). Homepage video (`columns`): the real YouTube player mounts 300 px before it
  scrolls into view, with a YouTube poster until then (D-055). Axe skips the inside of YouTube, Vimeo and Instagram
  iframes but checks our wrapper and the iframe `title`. **Done.** [MIGRATION.md 2026-09-05, 2026-10-02; D-021]

### 4.6 Martech, analytics and consent

Source: [docs/MARTECH.md](MARTECH.md). Vendors are configured per site in the authored
`/configs/site-config` DA sheet (one tab per page-load phase, D-015; an authored sheet, not the DA org config, D-048) and
loaded by `scripts/martech/loader.js`; **no environment logic in code.** The work is being ported from
`aem-coder-branch` to `develop` in four PRs, one vendor each (D-069).

| Vendor / capability | Phase | Status |
|---|---|---|
| Config sheet + loader (`site-config.js`, `loader.js`) | delayed | **Done for the delayed phase, on `develop` only** (Martech 1/4, 2026-10-14: `2e8c8f0`, `7e3c377`, `2cb2e68`; not on `main`). `scripts.js` calls `runPhase('delayed')` on every page and, since 3/4, `runPhase('eager')` on pages with `Target` metadata (elsewhere the `eager` tab is read only for `consentRequired`). The `lazy` tab is not read yet (its hook comes with 4/4). `MODULES` lists `hotjar` and `target`, so any other `<module>.enabled` row logs "unknown module". |
| Adobe Analytics via Tags (Launch) | delayed | **Done** on `develop` (D-044). The interim production library still contains Target and a Hotjar rule (§11). |
| Hotjar (`scripts/martech/hotjar.js`) | delayed | **Done** (2/4, PR #14 `b6236c7`, on `develop` only; D-068) |
| Adobe Target | eager | **Done in Martech 3/4** (branch `feature/target`, PR to `develop`; not on `main`. Reference build on `aem-coder-branch`: `1958509`, `138d4af`, `a227503`). `scripts/martech/target.js` + `target-a4t.js`, at.js 2.11.4 and VisitorAPI 5.5.0 in `scripts/martech/vendor/`, configured by the eager tab's six required rows (`target.enabled`, `clientCode`, `serverDomain`, `imsOrgId`, `a4t`, `flickerTimeout`; any missing or invalid → one warning, not loaded). Runs only on pages with `Target` metadata; the first section waits for offers up to `target.flickerTimeout` (1000 ms); when `consentRequired` is true the page is not held and Target loads after consent (D-045). Verified: simulated offer in the first paint; live delivery HTTP 200 to the test client on the HTTPS develop preview. A4T modes `client` / `server` / `off` (`true` = server, `false` = off); the dev config uses `client` (no VisitorAPI, D-052) and the test client `codeandtheoryamerpar` (USTA's IDs: `.ema/plan.md` §1 on that branch). **Before production:** USTA's Tags library must drop Target (never run site at.js with a Launch library that contains Target); the Tags page-view rule should set `window.targetA4TPayloadSent = true` (owner TBD). Target delivery returns 400 on `http://localhost`, so test on HTTPS previews. Measured cost: about +2 s mobile LCP on Target pages (G4). [branch `.ema/design.md` §5, §6, §11] |
| Fundraise Up as config row + donation analytics | lazy | **Planned** (4/4). Today `scripts/donate.js` is imported in the delayed phase (3 s) on every page; only then does it load the widget and rewrite donate links. Donation beacons rely on the interim Launch library's own Fundraise Up rules (the loader runs after `donate.js` so those rules see the stub, `7e3c377`). A reference build is on `aem-coder-branch` (`c98fe46`, `daff30e`; D-046): the widget loads on deliberate interaction or with `?form=`, and beacons are sent from code. |
| OneTrust consent (target design: `consent.update` event, `window.hlx.consent`) | lazy | **In progress on branch `one-trust`** (Vishal90124, 2026-10-07 → 10-14), not on `develop`. Uses usta.com's OneTrust property `43383d2d-67e6-4d4a-99cb-3ff760b82737`, Google Consent Mode v2 (default denied) and per-vendor gating on OneTrust groups, without `OtAutoBlock.js` (D-060, D-066). Not rebased on Martech 1/4–2/4: it reads `onetrust.*` and `consentRequired` from the old `/site-config.json`, imports `consent-check.js` eagerly, sets no `window.hlx.consent` (its `consent.update` carries per-vendor flags read through `onVendorConsent`), and loads Hotjar through `hotjar-router.js`, which `develop` removed. Must be reworked into a `scripts/martech/` module (lazy tab) before its PR. Until then the `?consent=` placeholder in `consent-check.js` is the gate (§11). |
| Data layer (`window.dataLayer`) | eager | **In progress, branch only** (`feature/data-layer-1`, Vishal90124, 2026-10-06; D-057). See R-M6. |
| Feroot client-side script monitoring (`pg.feroot.com/v1/bundle/4191fead-…`; its config lists `ustafoundation.com/en/home.html?form=DONATE`, the usta.com wallet page and `usopenshop.org/checkout`) | head (donate page) | **TBD.** Experiments only, none merged: `feroot-test` (Aman Kumar, 2026-09-21: tag in `head.html`, then with a nonce); `ananlysis-feroot` (uditupmanyu-candt, 2026-09-21 → 09-25: first-party copy of the bundle, then a synthetic load twin to measure cost); `feature/eds-4` (uditupmanyu-candt, 2026-10-05: inline nonce'd loader in `head.html`, only on `/en/home/donate`). All edit `head.html` (N2); MIGRATION.md records no outcome (§12 Q25). |
| Google Maps JS API + Places library (EDS-125) | TBD | **In progress, branch `feature/eds-125` only** (uditupmanyu-candt, 2026-10-14). The branch adds a second, generic loader (comma lists of URLs in `script.eager` / `script.postlcp` / `script.delay`, `\|attr` tokens, a no-op stub for a missing `callback=`); the Maps URL appears only as a code-comment example and no block or page uses it. Rebuild as a `scripts/martech/` module on the D-015 loader (§11, §12 Q26). |

- **R-M1.** A missing tab or setting turns that feature **off** with a `[site-config]` warning; the exception is
  `consentRequired`, which fails closed (D-067). Each tab stays small (~1.5 KB budget).
- **R-M2.** Each site (and environment) keeps its **own** config sheet so vendors and consent settings stay independent.
  "Environment" means a DA site, not a code branch: every code branch previewed on a DA site reads that site's sheet (§11).
- **R-M3.** Martech test scripts live on branch `aem-coder-branch` (`tools/martech-tests/`, added 2026-10-11 in
  `3320018`), together with `tools/da-sync/` and the `.ema/` hand-over docs, not on `develop`. They are manual Playwright
  and Lighthouse scripts that print results for a person to read (not CI, no assertions), written for the old
  `/site-config.json` model, so they must be rewritten for `/configs/site-config.json?sheet=<tab>`. The branch sits on an
  older `develop` history (`aacbdb5`): port by PR, do not merge. **TBD:** owner and date.
- **R-M4. Admin-only sheet.** Only martech admins can edit `/configs/site-config`; all other authors read (DA org
  permission rows, D-049). Each new site or environment adds the write/read rows before publishing (docs/MARTECH.md §1).
  **Done** for the old `site-config.json` sheet; rows for the new `/configs/` path are **TBD**, then
  retire the old sheet and its rows.
- **R-M5. Adding a vendor.** Everything in `/configs/site-config` is public, like the code: never put secrets in it. A
  plain vendor script needs only a `script.<name>` row in the tab of its phase. A vendor that needs code gets a module
  `scripts/martech/<name>.js`, its name added to `MODULES` in `loader.js` (only listed modules are ever imported), and its
  `<name>.*` rows (D-068). Modules run in parallel, never import each other or `consent-check.js`, and a failing module
  never blocks another. [docs/MARTECH.md §1–2]
- **R-M6 (In progress, branch only). Data layer.** First-party `window.dataLayer` (GTM convention), created first in
  `loadEager` by `scripts/data-layer.js`; `onDataLayerEvent(type, handler)` also replays earlier pushes. Fundraise Up
  `checkoutOpen` / `donationComplete` are pushed there and mapped to Analytics donation beacons; no page-level schema yet.
  Built on the old `analytics.js` + `/site-config.json` (neither exists on `develop`), so it must be ported onto
  `scripts/martech/`; the donation beacons arrive with Martech 4/4. GTM and a Meta Pixel are **planned** vendors (**TBD**
  owner/date).

### 4.7 Header, footer and breadcrumb

Source: `blocks/header/`, `blocks/footer/`; [MIGRATION.md](../MIGRATION.md) 2026-09-06 to 2026-10-07; [VALIDATION.md](../VALIDATION.md) §2.

- **R-H1. Breadcrumb (Done, D-030).** Built in `blocks/header/header.js`. Ancestor labels come from `/query-index.json`
  (`breadcrumbtitle`, else `title`); the current page uses its own `Breadcrumb Title` metadata, else the document title.
  The URL slug is only a last-resort fallback (e.g. on localhost, where the index 404s). The segments `content`, `en` and
  `news` are hidden, so news articles read "Home > {title}". On the homepage "Home" is plain text
  (`aria-current="page"`); elsewhere it links to `/en/home`. On mobile the trail is one line that scrolls; on desktop the
  last crumb is cut off with an ellipsis. The row aligns with the logo, not the content grid. All 84 pages matched the
  source breadcrumb on 2026-09-08.
- **R-H2 (Done).** The compact (hamburger) header is used up to 1199 px; the desktop bar starts at **1200** (`isDesktop`),
  as on the source.
- **R-H3 (Done).** Nav and footer load only from the root fragments `/nav.plain.html` and `/footer.plain.html`; change them
  in DA (local `content/nav.plain.html` edits do not show). The footer follows the source's float grid, with content
  capped at 1600 px (the sage band stays full-bleed).
- **R-H4 (Done).** Internal links use extensionless paths (`/en/home` returns 200, `/en/home.html` returns 404; §12 Q19).
- **Known differences kept (user decision 2026-10-07, D-020):** the breadcrumb row is 30 px vs the source's 40 px at
  1200–1369 px (the source switches at 1370). The footer "KEEP UP WITH US" offset is left to bug EDS-94.

### 4.8 Query indexes

**R-Q1. Query indexes (Done).** `helix-query.yaml` defines two indexes, built by the pipeline on **publish**: they 404 on
localhost, and a new field fills only after pages are re-previewed or re-published.

- `default` → `/query-index.json`: all pages except `/drafts/**`, `/nav`, `/footer` and `/**/fragments/**`. Fields:
  `title` (og:title), `breadcrumbtitle`, `relatedtitle`, `description`, `image` (og:image), `publicationdate`,
  `lastModified`, `robots`. Used by the breadcrumb (R-H1).
- `news` → `/news-index.json`: `/**/news/**`, minus the `…/news` listing and drafts. Adds `imagealt` (`og:image:alt`,
  which EDS fills from the Metadata "Image Alt" row, else the first content image's alt) and `newstags`. Used by Related
  Articles (R-T3).

Author metadata read: `Title`, `Description`, `Image`, `Image Alt`, `Breadcrumb Title`, `Related Title`, `Publication
Date` (empty → `lastModified`), `News Tags`. **TBD:** how each repoless site (`foundation-com`, `usta-dev`, `usta-com`)
gets these index definitions. No sitemap or robots config exists in the repo (§12 Q28). [MIGRATION.md 2026-09-06, 2026-10-06]

---

## 5. Design-system requirements

Decided **once**, recorded in files; never re-litigated per task. A value that appears on more than one page or block
is a global token, not per-block CSS.

| Area | Requirement | Source of truth | Status |
|---|---|---|---|
| Breakpoints | `768 / 992 / 1200`, mobile-first, `min-width` only, never mixed with `max-width`. The source also switches at other widths (breadcrumb and usta.com header at 1370; wide desktop); these are not added as tiers: map them to the nearest tier or use fluid `min()`/`calc()` caps, and accept the drift (D-020) | `tools/quality/breakpoints.json`; `check:breakpoints` | **Done** |
| Grid | One 12-column grid, 30 px gutter, `--grid-gap`; align by column span (`.grid-12`, `.grid-col-*`); no bespoke `width:52%` | `breakpoints.json` (`grid`); `check:overflow` | **Partly done.** The container is global (`main > .section > div`: fixed centred 336 mobile (D-026), 720 tablet, fluid to 1170 desktop (D-008)), and so is `--grid-gap: 30px`. `.grid-12`, `.grid-col-3/4/6/8/9` and `.container-max` exist in `styles/styles.css`, but nothing in `blocks/`, `templates/` or `scripts/` uses them: blocks and sections set their own widths and spans (e.g. `split-5-6` builds its own 12-col grid; cards and `banner-stats-grid` use `min(1170px, calc(100vw - 90px))`) |
| Full-bleed | Target: generic section styles `full-width`, `full-width-left`, `full-width-right` (AGENTS.md Grid Rule); never `!important` on wrappers | [skills/full-width-escape-hatch](../skills/full-width-escape-hatch/SKILL.md) | **Not built.** No `.full-width*` rule exists in `styles/`, `blocks/` or `templates/`. Wide/full-bleed bands are per block today (`cards (content)`, `cards (tiles)`, `banner-stats-grid` set their own cap; `cards (expand)` adds a negative `margin-inline`), plus the `map-wide` section style. **TBD:** build the generic styles or log the deviation in MIGRATION.md |
| Units | Pixel-first, matching the source (root 10 px); spacing scale 4/6/8/10/12/15/16/20/24/30/40 | `breakpoints.json` | **Done** |
| Typography | Match source h1–h6 + body (size, line-height, weight, family) at every breakpoint; self-hosted fonts. One H1 size site-wide, colour per template (D-032); 24 px heading/paragraph rhythm (D-059) | `tools/quality/typography.json`; `check:typography` | **Done for h1–h4 and body.** Captured with `discover:typography`; MIGRATION.md logs `check:typography` passing at 390/768/992/1200 from 2026-09-03 to 2026-10-12 (home; all 27 block samples; leadership, who-we-are, get-involved; YPI, Chris Evert and news). No raw output is stored, and from 2026-09-23 the CLI often could not launch (§11), so re-run it per page in the gate. Open: h5/h6 were measured (18 / 16 px) but are not in `typography.json`, while YPI authors `<h6>`; the checker measures page-scale headings only; the leadership Board label `<h3>` still drifts (§12 Q22) |
| Fonts | Graphik (Regular, Semibold, XXCond Bold) wired as brand fonts; XXCond Bold is preloaded and declared inline with `font-display: block` (D-031). IBM Plex Sans (SIL OFL, 400/600) is `--widget-font-family` for the Fundraise Up cards (D-061). Inter, Barlow Condensed and Anton are declared in `styles/fonts.css` but no CSS uses them (~1.2 MB of TTF, incl. the 874 KB `inter-variable.ttf`; browsers don't fetch them while unused) | `fonts/`, `styles/fonts.css` | **Done**; **licensing for Graphik unconfirmed** (§11); **TBD:** wire, subset or drop the unused faces |
| Tokens | Colours, fonts, type scale (per breakpoint), `--grid-gap`, `--nav-height` in `:root` of `styles/styles.css` (`styles/brand.css` was inlined and deleted, D-043) | `styles/styles.css` | **Done** for those. **No spacing, radius or shadow tokens exist**: radii and shadows are hard-coded per block, and the spacing scale is only a note in `breakpoints.json`. **TBD:** whether to add them. A token that authored content names (e.g. spacer `color: cards-band-bg`) is part of the authoring contract and must never be deleted as "dead". Extend per new site |
| Section patterns | Section Metadata `Style` values, composable and block-agnostic (catalogue in §4.2) | `styles/styles.css` | **Done**, except the generic full-bleed styles (row above) |

**R-S1 (Planned).** The USTA.com site has a different button system and breakpoint behaviour (usta.com's grid steps at
1370; below 1370 it is mapped to the project's 1200 tier). Before building USTA.com templates, run
`npm run discover:breakpoints` and `npm run discover:typography` against usta.com and decide *per site* whether the
shared `breakpoints.json` is sufficient or needs per-site values. **TBD** (§12 Q4, partly answered).

**R-S2 (TBD). Source column inset.** Source content sits inside AEM grid columns with a side inset of 4 px (<768) / 6 px
(768–991) / 15 px (≥ 992), so text columns are 328 / 708 px, then fluid (the homepage collage text uses 7.5 px on
mobile). `templates/news`, `cards (profile, bio)`, `cards (support)`, `quote`, the footer, hero panels, `columns`,
`split-5-6` and `embed-instagram` each re-implement it. Record it once (e.g. `breakpoints.json` `grid` plus a `:root`
token or grid utility) and reuse it. [MIGRATION.md 2026-10-01, 10-02, 10-12, 10-13]

**R-S3. Type parity method.** Check parity by measuring both sites on the live rendered DOM and diffing each value; adopt
the source's computed values, not its stylesheet (D-006). Wait for `document.fonts.ready` at device scale factor 2, or
Graphik may not load and line wraps mislead. Measure at the real viewport width with devtools closed (AEM "scalable"
titles shrink otherwise). Measure the deepest text element (e.g. `<h4><b><i>`), because a wrapper's computed weight can
hide what is painted. Re-measure any drift a subagent reports before changing code. The source declares each Graphik face
as one weight-400 face, so its bold is synthetic: match it with `font-weight: 700` on Graphik Regular, or a 400-declared
alias (`Graphik Semibold Synthetic`, `styles/usta-buttons.css`), and compare zoomed crops. Source AEM buttons reset
`letter-spacing` to `normal` on the label span. Not yet in `skills/typography-system`. [MIGRATION.md 2026-09-03, 09-04,
09-06, 10-07, 10-11]

---

## 6. Non-functional requirements

| ID | Requirement | Enforced by |
|---|---|---|
| N1 | **No build step, zero runtime dependencies, no frameworks**; native ES modules with `.js` extensions | Review; `eds-code-conventions` |
| N2 | **Never modify** `scripts/aem.js`, `head.html`, `package-lock.json`, `node_modules/`; new utilities go in `scripts/scripts.js` | Review |
| N3 | **Block isolation:** every CSS selector scoped to its block; no `nth-child` for per-item logic (in blocks it is used only in the `:has()` 2-up/3-up cards counts); no `!important`, except `embed-instagram.css`, which overrides Instagram's injected inline iframe styles (MIGRATION.md 2026-09-09) | **Review only.** `.stylelintrc.json` only extends `stylelint-config-standard`, which has no rule for scoping, `!important` or `nth-child`. `lint:css` and `breakpoint-check.mjs` scan only `blocks/**/*.css` and `styles/*.css`, so `templates/**/*.css`, `tools/plugins/**` and `tools/da-library-preview/**` CSS are neither linted nor breakpoint-checked; `eslint .` skips `.mjs` (`tools/quality/*`, `tests/a11y/*`). **TBD:** widen the globs |
| N4 | **Performance:** three-phase loading (eager → lazy → delayed; delayed runs 3 s after lazy, D-039); LCP content in eager; martech only after the first section/delayed; PSI target 100. In use: hero background preload with `fetchpriority=high`, sized to viewport × DPR (D-070); the homepage YouTube player mounted only near the viewport behind a poster (D-055); collage renditions capped at 600/750 px (`capPictureWidth()` in `columns.js`; other blocks still request EDS's default `width=2000`); no CSS `@import` chain (D-043); template CSS does not block the eager render (§9) | PSI on feature preview |
| N5 | **Accessibility:** WCAG 2.1 AA; descriptive `alt` (decorative `alt=""`); one `<h1>`; contrast ≥ 4.5:1; touch targets ≥ 44 px; visible `:focus-visible`; usable at 320 px / 200 % zoom. **Not fully enforced today:** axe `color-contrast` is off in `tests/a11y/a11y.config.js` (brand palette kept by product decision, D-053), so `test:a11y` does not check contrast (`test:a11y:nav` does, because it ignores `disabledRules`). Third-party iframes are excluded from scans. Tweet links are colour-only like the source, so `link-in-text-block` (serious) fails `test:a11y` on news pages with a tweet. One `<h1>` and heading order are best-practice rules the config does not run, and some pages keep the source levels (§12 Q20) | `npm run test:a11y` (with the gaps above) |
| N6 | **Security:** no secrets committed; no `eval`/`new Function`; validate external input; sanitize author/external HTML with DOMPurify before `innerHTML` | Review; `skills/security` |
| N7 | **Localization:** no hard-coded user-facing strings; source from content or data. **Not met in code** (§11) | Review |
| N8 | **Assets:** committed SVGs small (warn > 8 KB, fail > 40 KB); large illustrations rasterized to 2× PNG; images optimized | `npm run check:svg` |
| N9 | **No horizontal overflow** at mobile baseline, every breakpoint and wide desktop (the checker starts at 360 px, not 320, §11) | `npm run check:overflow` |
| N10 | **CSP and Trusted Types.** `head.html` sets `script-src 'nonce-aem' 'strict-dynamic' 'unsafe-inline' http: https:; base-uri 'self'; object-src 'none'; frame-src 'self' https:; require-trusted-types-for 'script'`. Only the nonce'd scripts and the scripts they create run (`strict-dynamic`; the other entries are fallbacks for old browsers), so third-party scripts must be injected from code such as `scripts/martech/loader.js`, never as inline `<script>` in content or `head.html`. `scripts/scripts.js` installs the top-level `default` policy: it removes `srcdoc` from iframes, strips `<script>` from `createContextualFragment` / `document.write` HTML, and passes scripts and script URLs through. `scripts/donate.js` adds pass-through policies in Fundraise Up's frames (§11). `404.html` has its own laxer CSP (no `frame-src`, no Trusted Types) | Review; `head.html` is untouchable (N2) |
| N11 | **Only site files are published.** Code Sync serves everything not in `.hlxignore`, so dev tooling must be listed there. **Not met** today (§11) | `.hlxignore`; review |

---

## 7. Quality gate (definition of done)

No change is "done" until these run and the output is shown (AGENTS.md, *Verify before claiming done*). Run the
dev server with `aem up` (`http://localhost:3000`) for URL-taking checks.

| # | Command | When |
|---|---|---|
| 1 | `npm run lint` | always |
| 2 | `node tools/quality/breakpoint-check.mjs` | any CSS change |
| 3 | `npm run check:overflow <url>` | section/content-width or layout change |
| 4 | `npm run check:typography <url>` | typography or global CSS change |
| 5 | `npm run check:svg` | any SVG under `icons/` added/changed |
| 6 | `npm run test:a11y <url>` | any UI/CSS change |
| 7 | Visual check at `localhost:3000`; review diff for dead code; update `MIGRATION.md` and the affected `docs/` files (AGENTS.md, Project-Docs Rule) | always |

**Local preview limits.** `aem up` serves code from the working copy but content from the preview (`aem.page`): a page
that has never been previewed 404s locally, and content-only changes (section styles, metadata, re-imports) show only
after DA preview, which is on request (R-I3). For content not yet in DA, use static drafts (`--html-folder drafts`); the
CLI caches its file list at startup, so restart it after adding a draft. The query indexes exist only once pages are
published (R-Q1). This repo tracks no `content/` folder, although MIGRATION.md and some tools refer to `content/…` paths.
[MIGRATION.md 2026-09-06, 2026-09-15, 2026-09-30]

**CI** (`.github/workflows/`): `main.yaml` runs `npm run lint` on every push. `a11y.yml` runs on every pull request: it
fails if the PR body has no `- After:` line, or if the After URL's branch (the host part before the first `--`) differs
from the PR branch with `feature/`, `bugfix/` or `hotfix/` changed to `<prefix>-` (it does not check the site or org in
the URL), then runs `npm run test:a11y <After URL>` on that one page, with `color-contrast` off (N5). The lower-casing
that lets a capitalised branch pass (BRANCHING.md's own example `feature/EDS5hotjarintegration`) is a change to
`a11y.yml`, on `develop` since PR #15 (`2860acd`), 2026-10-16; before it, such PRs failed this check. `sync-block-collection.yaml` only runs in
`adobe/aem-boilerplate`; `cleanup-on-create.yaml` is a boilerplate leftover (§11). Checks 2–5 are **not** in CI (local
only): see §12 Q8. (Branch normalisation added in `53dd0b0`, 2026-09-29.)

**Other checks** (not in the gate; run before sign-off or after a global change): `npm run test:a11y:all` sweeps every
URL in `tests/a11y/a11y.config.js` (base `A11Y_BASE_URL`, default `localhost:3000`). `npm run test:a11y:nav [url]` scans
the open mobile nav and the expanded desktop nav (its default URL `/content/index` assumes a local `content/` mount, so
pass a URL; it ignores `disabledRules`). `node tools/quality/audit-site.mjs` checks links and breadcrumbs against the
source; `audit-breadcrumbs-news.mjs` re-checks news breadcrumbs; `tools/quality/audit/related-articles-audit.mjs` replays
the Related Articles feed. Results go to `tools/quality/audit/` and VALIDATION.md (last run 2026-09-08: 84 pages, 367
links, 0 migration-introduced breaks, 0 breadcrumb mismatches). Limits: the audits hard-code
`https://main--foundation-usta--aemdemos.aem.live`, and the related-articles audit reads `content/en/home/news`, which is
not in the repo.

---

## 8. Delivery and process

> **Status (2026-10-15):** the process docs this section relies on are not committed yet. `docs/BRANCHING.md`,
> `PR_AGENT.md`, `docs/assets/*.svg` (§9), `docs/ARCHITECTURE.md`, this PRD and `decision.md` are untracked. The AGENTS.md (Branching
> strategy, Publishing Process), README, PR template, `a11y.yml` and `.hlxignore` changes are uncommitted; the committed
> AGENTS.md on `develop` still says "Open a pull request to merge changes to `main`". Treat §8.1–8.2 as **In progress**
> until these are merged to `develop`.
>
> **Update (2026-10-16):** all of the above are on `develop` since PR #15 (`2860acd`).

### 8.1 Branching and release

`feature/*` → `develop` (QE) → `uat` (business) → `main` (production), **by pull request only**; code moves forward only.
Feature branches are `feature/<TicketAndName>` (one word after the slash), rebased on `develop` before the PR.
Developers open `feature/*` → `develop`; **Leads** open `develop` → `uat` and `uat` → `main`. An agent never opens a PR
into `uat`/`main` unless asked. Full rules: [docs/BRANCHING.md](BRANCHING.md).

**Status (2026-10-15):** `origin` has `main` and `develop` but **no `uat` branch**, so the `develop` → `uat` → `main`
promotion has never run. So far `main` has received only Adobe's code (`ce9ed31` and the drops in §8.6). Creating `uat`
is **Planned** (needed for P1). Branch names must also fit the preview host limit (§11). [git branch -a]

### 8.2 Pull requests

Follow [PR_AGENT.md](../PR_AGENT.md) and `.github/pull_request_template.md`. A PR **must** include an Before/After preview
link per site with content, or it is rejected. Never commit to `develop`/`uat`/`main` directly or force-push.

### 8.3 Environments and repoless plan

- Code reaches the edge through AEM Code Sync; content is authored in DA and published separately. Branch previews:
  `https://{branch}--foundation-dev--usta-digital.aem.page/`.
- **Planned:** repoless — this one repo feeds both sites; each site has its own DA content (`<name>-dev` / `<name>-com`)
  and martech sheet; Akamai fronts both production domains. Whether to use a shared profile is **undecided**.
  See [README](../README.md) and `docs/assets/repoless-plan.svg`. Background: aem.live/docs/repoless.
- **R-E1. Add a site or environment.** Follow docs/MARTECH.md §1 "Add a site or environment": create the DA site; add
  `/configs/site-config` with all three tabs `eager`, `lazy`, `delayed` (with only one tab EDS serves it as `default` and
  `?sheet=` stops working) and the vendors' rows, including `consentRequired` on purpose (D-067); add the DA org
  permission rows (R-M4); Preview and Publish. For authoring, register the Buttons plugin in the site's DA config (R-A3);
  without `/.da/library/buttons` and its `icon` row the Icon dropdown shows only "No icon". MARTECH.md says "No code
  change": that holds for a new environment of an existing site. A new site (USTA.com) also needs the per-site values that
  are hard-coded today (§11) and the query-index definitions (R-Q1).

### 8.4 The Migration Log

`MIGRATION.md` is the project's running memory. Append an entry whenever a block, template or section is built or
changed, a non-obvious problem is solved, or a rule is deviated from — **before** claiming the task done. It is
project-specific and never copied between projects (only `MIGRATION.template.md` is). It was written mostly in Adobe's
repository: hashes, branches and PR numbers it cites may not exist here (§11). The project docs (`PRD.md`, `decision.md`,
`flow.md`, `ARCHITECTURE.md`) are updated in the same PR as the change (AGENTS.md, The Project-Docs Rule, D-075);
MIGRATION.md links to their `D-xxx` entries rather than copying them.

### 8.5 Skills

`skills/README.md` indexes the best-practice skills agents must load on demand (e.g. `grid-system`,
`typography-system`, `accessibility`, `content-import`, `verify-before-claiming`). `verify-before-claiming` is the one
skill loaded every session; all others load from their "Load when…" trigger, never speculatively. Where a project skill
covers the same ground as a built-in plugin skill (`excat:`, `edge-delivery-services:`), the project skill wins and is
loaded first. Every skill change updates `skills/README.md`. New knowledge from a correction or a non-obvious fix is
proposed as a new/updated skill (`skills/writing-skills`).

### 8.6 Adobe code drops (observed practice; not in BRANCHING.md)

Adobe's team builds blocks, importers, buttons and the MIGRATION.md log in its own repository (`a9861e9`: "Latest pull
from Adobe's repository"; MIGRATION.md names `main--foundation-usta--aemdemos`). Each drop
arrives as one snapshot commit on its own branch and is merged by PR **straight into `main`**: #1
`updates-from-adobe-team` (2026-09-24), #4 `update-from-adobe-29-09-2026` (09-29), #8 `code-sync-from-adobe` (10-07), #9
`update-from-adobe-13-10-2026` (10-13), #10 `update-from-adobe-14-10-2026` (10-14). `develop` is then rebased onto `main`
and force-pushed: after #9, and again on 2026-10-14 after #10 (the pre-rebase tip `62b01f5` is kept as the local branch
`backup/develop-pre-rebase-2026-10-14`). Per docs/MARTECH.md a drop can replace `scripts.js`, `consent-check.js`,
`consented.js`, `donate.js` and `MIGRATION.md` wholesale, so after each drop run the checks in MARTECH.md "After an Adobe
code drop" and re-check MIGRATION.md statuses against this repo. **TBD:** make this lane official in BRANCHING.md, or
route drops through `develop` (§12 Q13). Source: `git log --first-parent main`; reflog of `develop`.

### 8.7 Branches not merged into `develop`

Snapshot 2026-10-15, after fetch. [git branch -a; `git rev-list` / `git cherry` against `develop`]

| Branch | Last author, date | What | State |
|---|---|---|---|
| `aem-coder-branch` | Aman Kumar, 2026-10-11 | Martech reference build: Tags, Target (at.js, client-side A4T), Fundraise Up on interaction + donation analytics, `da:sync`, `.ema/` hand-over, `tools/martech-tests/` | Source for the Martech 1/4–4/4 PRs (D-069). Cut from the pre-rebase `develop` (holds `aacbdb5`), so port by PR, never merge |
| `one-trust` | Vishal90124, 2026-10-14 | OneTrust integration: `consent-check.js`, `consent-vendors.js`, `docs/otautoblock.md`, `docs/usta-consent-usta-com.xlsx`, `tools/consent-audit.js` | In progress. Based on `develop` before Martech 1/4 (`e01f2f4`), so it predates the loader (§4.6) |
| `feature/data-layer-1` | Vishal90124, 2026-10-06 | `window.dataLayer` (D-057) | Not merged; status n/d |
| `feature/data-layer` | VishalSharma00123, 2026-10-05 | Adobe Client Data Layer (`window.adobeDataLayer`) | Superseded by `data-layer-1` (D-057) |
| `feature/eds-125` | uditupmanyu-candt, 2026-10-14 | Google Places script; `script.eager` / `script.postlcp` / `script.delay` URL lists in `site-config.js` | In progress; a second script-loading path beside the loader (§11) |
| `feature/eds-4`, `ananlysis-feroot`, `feroot-test` | uditupmanyu-candt 10-05; uditupmanyu-candt 09-25; Aman Kumar 09-21 | Feroot script via `head.html` (`ananlysis-feroot` also adds `scripts/feroot.js`) | Blocked by N2 (§12 Q25) |
| `feature/adobeAnalytics`, `feature/target-and-analytics`, `feature/one-trust` | VishalSharma00123 10-01; VishalSharma00123 09-25; Aman Kumar 10-01 | Early Analytics/Target work (self-hosted AppMeasurement + at.js; `feature/one-trust` holds only `aem-coder-branch` commits from before its 2026-10-07 rebase) | Stale |
| `feature/googleMap` | Aman Kumar, 2026-09-18 | Nothing beyond `ce9ed31` (Adobe's initial code) | Empty |
| `feature/hotjar`, `feature/eds-5`, `bugfix/git-workflow`, `code-sync-from-adobe`, `update-from-adobe-*`, local `backup/develop-pre-rebase-2026-10-14` | various, 2026-09-29 → 10-14 | Content already on `develop` under other hashes | Can be deleted (`aem-coder-branch` still holds the old PR #5/#6 merges) |

`usta-buttons` (§4.3) is not a branch in this repo.

---

## 9. Architecture

Parts, code layout, constraints and the repoless plan: [ARCHITECTURE.md](ARCHITECTURE.md). Diagrams:

| Diagram | File |
|---|---|
| Current site (visitors, aem.live, decoration, martech) | `docs/assets/current-site.svg` |
| Planned repoless setup | `docs/assets/repoless-plan.svg` |
| Martech loading | `docs/assets/martech.svg` |
| Branching strategy | `docs/assets/branching-strategy.svg` |

Key mechanics: `scripts/aem.js` + `scripts/scripts.js` decorate pages in three phases (the delayed phase starts 3 s after
lazy); page templates load `templates/<name>/<name>.css` from the `template` metadata in the eager phase without blocking
the first section's render (LCP-critical rules such as the H1 size stay in `styles/styles.css`, D-032), and the JS in the
lazy phase; `scripts/site-config.js` + `scripts/martech/loader.js` read per-site config; importers in `tools/importer`
load source pages into DA.

`template` and `theme` are read case-insensitively (`getMetadataNormalized()`), because the DA preview and the dev server
serve the author's casing and `aem.js` `getMetadata` is case-sensitive. `theme` only adds a `<body>` class (D-033).
`decorateMain()` runs in this order: `removeTrackingArtifacts` (drops imported Hotjar `_hjSafeContext` / `about:` links)
→ icons → auto-blocks (pasted EDS media URLs → `<picture>`, R-A5; `/fragments/` links inlined; `/widgets/` links →
`widget` block) → Section Metadata (`style` → classes, other keys → `data-*`; done in `scripts.js` because the vendored
`aem.js` does not) → sections → blocks → buttons. `<html lang>` is set to `en` in code (§12 Q29).

There is no `scripts/delayed.js`; it never existed in this repo, although AGENTS.md (project structure, performance) and
`skills/eds-code-conventions` still point to it. Delayed work happens in `loadDelayed()` in `scripts/scripts.js`: it
imports `consent-check.js` and `donate.js`, then runs `martech/loader.js` `runPhase('delayed')`. A new vendor is a
site-config row, plus `scripts/martech/<name>.js` when it needs code (R-M5). AGENTS.md and the skill should be corrected
to match; until then AGENTS.md wins, per the header.

---

## 10. Dependencies

AEM Edge Delivery Services / `aem.live` (+ Code Sync) · DA (da.live; also called at runtime: `?dapreview` loads
`da.live/scripts/dapreview.js` and the Buttons panel reads `admin.da.live`) · EDS admin API `api.aem.live` (the Env selector's
branch list, R-A7) · GitHub · Adobe Tags (Launch), Analytics, Target · Hotjar · Fundraise Up · OneTrust · YouTube
(`video-embed`; the `columns (feature)` player, poster from `i.ytimg.com`) · Instagram (`embed-instagram` loads
`instagram.com/embed.js`) · Akamai (CDN, production domains) · Playwright + axe-core (quality tooling) · source sites
`www.ustafoundation.com` and `www.usta.com` (live reference for parity). **TBD / planned:** Feroot (§12 Q25), Google Maps
Platform (§12 Q26), Google Tag Manager and a Meta Pixel (R-M6), the usta.com vendor set (§12 Q27). The `social` block
only links out to Facebook, X (Twitter) and LinkedIn. External tools for importing: the *excat* skill runner and esbuild
(R-I12).

---

## 11. Roadmap, risks and sequencing

> Dates are **TBD**; phases are ordered by dependency, not by calendar.

| Phase | Outcome | Contents |
|---|---|---|
| **P0 — Close out Foundation** | G1 met on the dev site | Re-verify T0–T7 status (R-T1); finish T3–T6 parity; migrate T7 (`404.html` is still the boilerplate page, the only page not migrated); confirm the homepage body work (§11 risk) ; resolve the leadership Board `<h3>` typography drift and add h5/h6 to `typography.json`; test USTA buttons in DA Layout with a signed-in session; finish the author-side DA steps (§12 Q18) and publish sample pages. [Done, so removed from v0.1: `check:typography` logged passing since 2026-09-03; `usta-buttons` merged in `e910fb9`; who-we-are HANDOFF tasks done by 2026-09-10; T2 is blank by design] |
| **P1 — Foundation to production** | `foundation-com` live | Create `uat` (§8.1); prod DA content; `foundation-com` martech sheet with `consentRequired` set on purpose; UAT sign-off; Lead-owned `develop`→`uat`→`main`; resolve Graphik licensing; security review of the Trusted Types relaxation; redirects (§12 Q19); fix `.hlxignore` |
| **P2 — Repoless + USTA.com setup** | G2 met | usta.com template catalog and scope (R-I5, R-S1); `usta-dev` site, config sheet, importers; decide shared profile; move Foundation-only hard-coded values to config |
| **P3 — Martech completion** | R-M items done | Port Target (3/4) and Fundraise Up + donation beacons (4/4) from `aem-coder-branch` onto the loader, one vendor per PR; rebuild OneTrust from branch `one-trust` on the loader (needed before any site with `consentRequired=true` goes live, §12 Q9); data layer (`feature/data-layer-1`); decide Feroot and Google Places (§12); bring the martech tests (rewritten for `/configs/site-config`), `da:sync` and the `.ema/` hand-over to `develop`; Launch-side work by the Launch, Analytics and Target admins: Analytics-only production library, USTA dev embed, rebuild the 2 jQuery click rules, `a4t.payload` processing rule, live A4T test, VEC selectors re-pointed to EDS markup |
| **P4 — USTA.com to production** | `usta-com` live | UAT, Akamai fronting, cutover plan |

### Risks

**Delivery and process**

| Risk | Impact | Mitigation |
|---|---|---|
| **Adobe drops land on `main`; `develop` is then rebased and force-pushed** (§8.6; reflog of `develop` 2026-10-14: rebase onto `f82777d`, then `origin/develop` updated to `e01f2f4`, which does not contain the old tip `62b01f5`) | Adobe code reaches the production branch without QE or UAT. Branches cut from the old `develop` carry duplicate or orphaned commits: the PR #5/#6 merge commits (`e8f9d5a`, `aacbdb5`) survive only on `aem-coder-branch`, `feature/eds-125` (and `feature/eds-5`). Contradicts §8.2, BRANCHING.md rules 1 and 3, and D-011 | Decide the drop path (§12 Q13). Merge `main` into `develop` without rewriting it, or take drops into `develop`. Announce any rewrite and rebase open branches straight after |
| **Branch rules are documented but not enforced.** Branch protection is a per-repository GitHub setting; in the repository checked on 2026-10-16 `develop` is unprotected, and the only ruleset (default branch) requires a PR with 0 approvals and no required status checks. PRs #9 and #10 (drops into `main`) and #14 (Martech 2/4 into `develop`) merged with `a11y` and `aem-psi-check` failing, and the Martech 1/4 commits (`2e8c8f0`, `7e3c377`, `2cb2e68`) reached `develop` with no PR | Failing a11y/PSI checks and unreviewed code reach `develop` and `main`; BRANCHING.md rules 1–3 and the §7 gate rely on goodwill | In every repository that holds the code, protect `develop`, `uat` and `main`: PR required, at least one approval, `build` and `a11y` as required checks (`aem-psi-check` once §12 Q30 is answered), no force-push. Decide with §12 Q8 |
| **Preview host limit:** `<branch>--<site>--<org>` must fit one 63-character DNS label (`.ema/implementation.md` §6 on `aem-coder-branch`) | The room left for the branch name depends on the host suffix: a 40-character `--<site>--<org>` leaves 23 characters (after lowercasing and `/`→`-`), the 30-character `--foundation-dev--usta-digital` leaves 33. Long names such as BRANCHING.md's own example `feature/EDS125googlePlaceLibrary` (32 characters), `update-from-adobe-13-10-2026` and `feature/target-and-analytics` (28) do not fit a 40-character suffix. A branch over the limit gets no preview, so its PR's After link and the a11y check fail | Add the length limit to BRANCHING.md and PR_AGENT.md step 1, counted against the longest site/org suffix that will preview the branch |
| Open martech branches conflict with `develop`'s config model: `aem-coder-branch`, `one-trust` and `feature/data-layer*` still use `/site-config.json` with `.production` / `.development` keys; `feature/eds-125` has Martech 1/4 but not 2/4 and adds a second loader on the transitional `getConfig()` / `whenSiteConfigReady()` that 2/4 removed, fetches the delayed tab in the eager phase (against D-015), and its `site-config.js:112` calls an undefined `fetchSiteConfig()` / `resolveReady`, so the module throws on import | A straight merge conflicts in `site-config.js`, `consent-check.js` and `scripts.js`, or breaks all martech and the consent check | Port each onto `/configs/site-config` + `scripts/martech/loader.js`, one vendor per PR (D-069); rebase on `develop` first |
| Boilerplate leftovers: `cleanup-on-create.yaml` can be run by hand (`workflow_dispatch`, or when `main` is created) and commits + pushes straight to its branch; `.renovaterc.json` automerges devDependency PRs, which Renovate opens against `main` (whether Renovate is installed is n/d); `CONTRIBUTING.md` is the Project Helix text (fork PRs, "commit then review", a non-existent `npm run commit`) | A direct commit to a long-lived branch; contributors follow the wrong process | Remove `cleanup-on-create.yaml`, `sync-block-collection.yaml` and `sync-block-collection.sh`; point Renovate at `develop` with automerge off (or remove it); replace CONTRIBUTING.md with a pointer to BRANCHING.md and PR_AGENT.md |
| **MIGRATION.md is 520 KB and partly stale** | Agents act on outdated status (e.g. T1 "needs importer") | Re-verify per R-T1; split/archive the log; keep a short current-status table. Known stale (2026-10-15): **§2** container "720 / 970 / 1170" (D-008) and type scale "pending"; **§2a** statuses; **§3 Buttons** "branch `usta-buttons`, not yet merged"; **§6 Standing** items done 2026-09-03 → 09-07; **▶ Typography steps** "`scale` is empty"; **🔴 HANDOFF** (blocker was a measurement error; key files still name `yellow-center-intro`); **§1** `aemdemos` hosts. Also the `typography.json` `$comment` |
| MIGRATION.md was written mostly in another repository that holds this codebase: the hashes (`472a662`, `81c44b0`, `6d6985d`, `cb94155`, `7c1395f`, `030eb3c`), branches (`usta-buttons`, `buttons-plugin`, `issue67`) and PR numbers (#5, #68–#70) it cites are not in this history | Agents cannot verify what the log cites; "branch pushed, not merged" statuses go stale once a drop lands | After each Adobe drop, re-check MIGRATION.md statuses against `develop` |
| Uncommitted CSS on `develop` is not logged: the working tree changes `styles/styles.css`, `blocks/columns/columns.css` and `templates/news/news.css` (compact-headings site-wide, D-072; a 60 px gap before non-center-intro yellow bands with the ≥992 px 121 px yellow-strip rule removed, so the who-we-are History → yellow strip gap falls back to 40 px; a 15 px inset on text-left columns rows at 992–1200 px, §12 Q21; yellow columns-band bottom padding 70 → 100 px) | A logged customer fix is undone without trace; the next agent re-derives the work | Log them (Migration-Log Rule) and re-check who-we-are against the 2026-10-07 entry before committing. **Logged 2026-10-16** (MIGRATION.md) and on `develop` since PR #15 (`2860acd`); `check:overflow` / `check:typography` pass on the four pages, but who-we-are was not re-checked against the 2026-10-07 entry |
| Mis-read deploy checks (the old HANDOFF "BLOCKER #1": deployed `styles.css` 34 lines vs 938 local) | Time lost chasing "stale code" | **Resolved.** It was a measurement error: the CDN serves `styles.css` gzip-compressed and `curl` without `--compressed` counted binary (MIGRATION.md 2026-09-08 round 4); the commits it names are not in this repo. Check a deploy with `curl --compressed <host>/styles/styles.css`. CSS goes live after push + Code Sync; content after a DA upload and preview |
| Experience Workspace's Insert-block dialog loads the **`main`** preview, and authors get the Buttons panel and Layout code from `main` unless DA is opened with `?ref=<branch>` | Authoring-tool fixes reach authors only after the full `develop → uat → main` cycle | Check library previews locally on `/.da/library/…` pages, and the panel / Layout on the feature branch with `?ref=<branch>`; plan authoring-tool changes into the release train |
| Agent access to DA depends on the "Allow LLM to use my Adobe credentials" opt-in (DA Settings → LLM Permissions); on 2026-09-08 it turned off and `admin.da.live` returned 401 | Agent imports, uploads and publishes stop mid-task | Check the opt-in before DA work; DA writes stay on request only (R-I3). Recipe: [VALIDATION.md §3](../VALIDATION.md) |
| DA publish is outward-facing | Accidental publication | On request only (R-I3) |

**Content and import**

| Risk | Impact | Mitigation |
|---|---|---|
| usta.com is ~36× larger than Foundation | Scope blow-up | Catalog templates first; rely on one importer per template |
| The content tree (`content/en/…`, `content/drafts/block-samples/`, `content/drafts/sections-samples/`, `content/assets/docs/`, `content/media-da/`), `migration-work/` and `tools/content/*.mjs` are cited in MIGRATION.md but are not in this repo or its history | Samples, content fixes and imports cannot be re-run or checked from this repo | Record where the canonical copy lives (DA `/drafts` or another repo); bring in the scripts still needed, or rebuild from `tools/importer/` |
| The news importer emits only Description, Image, Template and Publication Date (the sitemap lastmod, against D-042). It does not emit `List From` / `Sort Order` / `Max Items` / `News Tags` / `Pages`, and feed order depends on the index `lastModified`, which fills only on (re)publish. It also keeps a static `Cards (news)` snapshot of the source cards under the "Related Articles" heading and writes no `related-articles` section, so `news.js` appends its own feed in a new last section (`import-news-v1.js:972-981`; `templates/news/news.js:155-160`) | Wrong or missing related cards after a re-import, or until pages are republished; a re-imported page shows Related Articles **twice** | Make the importer, or a post-import step using the source `data-tags`, emit the feed metadata and the `related-articles` section instead of the static snapshot; verify on a live branch preview, not by simulation (§12 Q17) |
| Doc links in imported content are absolute to `https://main--foundation-usta--aemdemos.aem.live/assets/docs/…`, and `da:sync` copied them into our DA. `localize-docs.mjs` builds its base from `git remote`, so the result depends on which repository clone runs it, and under repoless the host uses the site name; its header says hrefs already on `…aem.live/assets/docs/` are skipped, but the code does not skip them, so a re-run rewrites them to `/assets/docs/assets/docs/…` | PDFs served from Adobe's demo site, broken once it goes away; doubled paths after a re-run | Pass `--base https://main--<site>--<org>.aem.live` per site; fix the skip before re-running; rewrite existing doc hrefs before go-live (relative links are not an option: DA strips `.pdf`) |
| Homepage body work from 2026-10-07 was taken out of the header/footer PR and kept only as a local patch (`/tmp/pr-full-before-scope.patch`): 1920 px page limit + `--page-max-width`/`--vw` tokens, hero CTA cap, `center medium` 4 px phone inset + "Ready" 75 % width, heading gaps, columns `feature` spacing, cards (support) mobile-title cell + parser. No later commit re-applies it, and the patch was not at that path on 2026-10-15 | T0 "Done" may be missing this work; the work may be lost | Confirm whether it was redone; if not, recover the patch or redo the items and re-verify T0 (owner TBD) |
| New or unpreviewed content 404s locally (§7) | Page-URL gates and visual parity cannot run on fresh imports or content-only changes | Preview first (on request), use a static draft, or verify on an already-served sample; log the check as pending |

**Design and authoring**

| Risk | Impact | Mitigation |
|---|---|---|
| **Graphik is proprietary** and self-hosted | Licensing breach if shipped to prod | Confirm licence before P1 (MIGRATION.md open item) |
| The DA Layout-view button preview keys on da.live internals (`.prosemirror-editor`, the mark nesting), not an API | If DA changes them, authors see a raw link plus the `[options]` text while editing, until a refresh. Published pages are unaffected | When it regresses, update the `.prosemirror-editor` selectors in `foundation-buttons.css` / `usta-buttons.css` and `EDITING_CTA` in `scripts.js` |
| The Buttons panel hand-mirrors `scripts.js` (importing it runs `loadPage()`): preview colours (`resolveColor()` / `contrastText()` / `applyColors()`), `STYLES`, `USTA_WORDS` + `styleInfo()`, `USTA_ICON_ALIASES` | After a `scripts.js` change the panel previews, or writes, a button differently from how the page renders it | Change both in the same PR ("Keep them in sync", buttons README §4); option: move the shared logic into a side-effect-free module both import |
| Authored button colours get no contrast check: a Foundation button with both `color` and `text-color` uses them as typed; a USTA button keeps its own text colour under an authored `color`; and axe `color-contrast` is off | Low-contrast buttons can reach production with no failing check, against N5 | Optional contrast check or warning in `applyCtaOptions()` / the panel; or re-enable `color-contrast` with targeted exceptions |
| N7 is not met in code: English UI strings are hard-coded in `templates/news/news.js` ("Related Articles", "Read More", alt "Visit the … page"), `donate-embed.js` ("Donate"), `video-embed.js` ("YouTube video", "Watch video"), `header.js` ("Home", "Breadcrumb", "Open navigation") and `404.html` | Low while both sites are English, but any site that needs other labels needs a code change | Record as a known deviation from N7, or source the strings from content or placeholders before USTA.com templates are built (§12 Q29) |
| Bot-blocked discovery tools | Failed breakpoint discovery | Half done: `typography-discover.mjs` already sends a browser User-Agent (MIGRATION.md 2026-09-03). `breakpoint-discover.mjs` still calls `fetch(url)` without one; add it before the usta.com discovery (R-S1) |

**Runtime**

| Risk | Impact | Mitigation |
|---|---|---|
| On news pages `loadLazy()` awaits `loadTemplateJS()` before `loadSections()`, so every section after the first stays hidden (`display: none`), and the footer waits too, until `/news-index.json` is fetched and the Related Articles cards block has loaded (`scripts/scripts.js:966-967`) | A slow or failed index fetch holds back most of every news article (73 pages) | Build the feed without blocking the other sections (e.g. load the sections first, then fill the reserved `related-articles` section), keeping its space reserved to avoid layout shift; re-measure LCP/CLS on a news page (flow.md §1, §4) |
| `loadTemplateJS()` swallows every error from a template's JS without logging ("template JS is optional", `scripts/scripts.js:888-893`) | A broken `templates/news/news.js` silently drops Related Articles on every news page, with nothing in the console | Log the error (keep it non-fatal); add a news page to the default sweep list (Quality and tooling) |

**Martech, consent, donations and security**

| Risk | Impact | Mitigation |
|---|---|---|
| Trusted Types relaxed for Fundraise Up: the `default` policy in `scripts/scripts.js` (since `ce9ed31`, not logged in MIGRATION.md) passes `createScript` / `createScriptURL` through unchanged, and `scripts/donate.js` redefines the `HTMLIFrameElement.prototype` `contentWindow` / `contentDocument` getters on every page | The CSP's `require-trusted-types-for 'script'` gives little XSS protection; a Fundraise Up or CSP change can still break the Donate tab or the inline form | Security review of `scripts/scripts.js` (lines 20–43) and `scripts/donate.js` (N6, N10); consider limiting the frame patch to Fundraise Up frames; re-test the Chris Evert page and a `?form=` overlay after any CSP or Fundraise Up change |
| Consent today is the placeholder `scripts/consent-check.js`: it declines unless the URL has `?consent=accept` (or `true` / `1` / `yes`). OneTrust is in P3, after P1 | With `consentRequired=true`, or no valid row (fails closed, D-067), Tags and Hotjar never load for real visitors; with `false`, nothing is gated | Before P1 set `consentRequired` on purpose in every site's eager tab (ustafoundation: `false`, D-047), or ship OneTrust first; record the per-site answer (§12 Q9) |
| Some third parties load outside the `consentRequired` gate: Fundraise Up (`donate.js` on every page, and eagerly from `donate-embed`), Instagram's `embed.js`, the homepage YouTube player and `video-embed` without its Row 2 message | Once OneTrust and `consentRequired=true` are live on a site, these run before consent | Decide which vendors need consent (§12 Q9); route them through `loader.js` / `ctx.whenConsented()` (Fundraise Up with Martech 4/4), or record an exemption |
| Branch `one-trust` is not release-ready: it hard-codes `consentRequired: true` for testing (`site-config.js:217-219`, "REVERT"); mixed per-category choices are untested; the choice is lost on reload on localhost (no `OptanonConsent` cookie off usta.com hosts); social embeds are not gated | Wrong consent behaviour, or a consent banner on a site that needs none | Before merge: revert the TEMP line and confirm D-047; test on a registered domain; decide embed gating |
| One `/configs/site-config` per DA site is read by every code branch previewed on that site (`develop`, `uat`, `main`, `feature/*`) | A row change made for an unmerged branch reaches every other branch (before PR #14, `develop` would have loaded a `script.hotjar` row as a plain script and failed with `_hjSettings is not defined`) | Change row formats only when the PR merges, and list the row changes in the PR; test new rows with tab variants served by Playwright routing. **TBD:** confirm the Hotjar rows were swapped after PR #14 |
| USTA's interim production Tags library ("USTA Foundation" property, `launch-b4bd8f30c678.min.js`) still contains Adobe Target and a Hotjar rule | Hotjar loads twice once `script.hotjar` is in the production config; two at.js instances once site Target is on | Keep `script.hotjar` out of the production config until the Launch Hotjar rule is removed (user, 2026-10-07). The Launch admin ships an Analytics-only library before site code loads those vendors in production; owner **TBD** |
| Analytics continuity at cutover: 2 of the interim library's 8 rules ("DIG-4755 links", "iframe buttons") need jQuery and old AEM classes, so nav/button click tracking is missing on EDS; `pageName` = `foundation:` + `document.title`, and titles still differ on who-we-are, what-we-do and special-funds. Launch-side prerequisites have role owners only | Broken or renamed reports at cutover; Target cannot go live | Name the admins; rebuild the 2 rules in vanilla JS in the new library; add Title metadata via the importer (R-I11); track in P3 |
| Fundraise Up loads at ~3 s on every page until Martech 4/4 | Its third-party cookies can fall inside Lighthouse runs (the branch measured standard mobile 67 / Best Practices 61 before its fix) | Ship Martech 4/4 (D-046) |
| Early donate clicks leave the page's host. Until `donate.js` runs (3 s after `loadLazy()` on most pages) `?form=` links keep their authored absolute href (e.g. `https://www.ustafoundation.com/…?form=JLLI`), and the link-target rules keep them in the same tab; the `cards (expand)` card-wide click does the same through `donateLink.click()`. On a `donate-embed` page `donate.js` runs once, at block load, so a nav or footer link added later is never rewritten (`scripts/donate.js:148-164`) | On a preview or UAT host a visitor or tester lands on the production site; on production an early click reloads a page instead of opening the overlay | Rewrite `form=` links at click time too (the Martech 4/4 reference build on `aem-coder-branch` does this, D-046) or earlier in the page load; test on a preview, not localhost (flow.md §3) |
| Foundation-only values are hard-coded in shared code: `INTERNAL_HOSTS` (`scripts/scripts.js`) knows only `ustafoundation.com` and `*--foundation-usta--aemdemos.aem.(page\|live)`; `donate.js` loads Foundation's Fundraise Up account `AURLRFGR` on every page; the breadcrumb "Home" links to `/en/home` | On USTA.com, Foundation's Donate tab and forms appear and links to ustafoundation.com open as internal. On any other preview or production host the aemdemos pattern never matches, so same-site links on that host open in a new tab (D-016) | Move per-site values to the site config before P2 (Fundraise Up is already planned as a config row); until then add each site's hosts to `INTERNAL_HOSTS` |

**Quality and tooling**

| Risk | Impact | Mitigation |
|---|---|---|
| Browser gates can't launch in some agent environments: `check:overflow`, `check:typography` and `test:a11y` need Playwright's `chromium_headless_shell-1187` (`@playwright/test` 1.55.0), the external import runner needs build 1208 (Playwright 1.58.2), and `npx playwright install` removes the other build | Since 2026-09-15 many log entries say these gates "could not run" and were replaced by checks in the preview browser, so the gate output AGENTS.md asks for is missing | Document the two-build setup (install 1208 with the runner's own CLI; point the gates at 1187 with `PLAYWRIGHT_BROWSERS_PATH`) in README or the `quality-tooling` skill; when a gate can't run, say so and name the substitute check. CI installs Chromium fresh, so it is not affected |
| `check:overflow` starts at a 360 px mobile baseline (`MOBILE_BASELINE = 360`), but N5 requires 320 px; on 2026-09-05 a header overflow below ~355 px was missed by the gate | Horizontal scroll on narrow phones passes the gate | Add 320 to the sweep widths, or check 320 by hand until then |
| With no URL, `test:a11y:all`, `check:overflow` and `check:typography` sweep only `/`, `/en/home` and the `/drafts/…` samples in `tests/a11y/a11y.config.js` (which still lists the retired `custom-content-related-articles` sample) | No news, landing, leadership, financials or special-funds page is swept by default | Add one URL per template (T1–T7), as the file asks ("KEEP IT CURRENT"); drop the retired samples |
| Docs and tools that disagree with the code: `templates/news/RELATED-ARTICLES.md` says "3–4 teaser cards" and describes decorative thumbnails (empty alt, `aria-hidden`, `tabindex=-1`), but the code caps at 3 (D-018) and uses the source alt pattern (D-056); `tools/quality/audit/related-articles-audit.mjs` slices by the raw `Max Items` with no cap; MIGRATION.md 2026-09-22 describes an older tie-break and an empty-tags fallback | Agents and reviewers work from the wrong spec; the audit reports card counts the page never shows | Update RELATED-ARTICLES.md and apply the same `MAX_LIMIT` clamp in the audit in the next news-template PR; the code is the ground truth (flow.md §4) |
| `.hlxignore` lists `test/*`, but the folder is `tests/`; `tools/importer/` (scripts, bundles, backups, 16 `.xlsx` reports), `tools/quality/`, `tools/assets/`, the `skills/` scripts and `sync-block-collection.sh` are not ignored either | Code Sync publishes dev files for every site (N11) | Change `test/*` to `tests/*`; ignore `tools/importer/`, `tools/quality/`, `tools/assets/`, `skills/` and `sync-block-collection.sh`; keep `tools/plugins/` and `tools/da-library-preview/`, which the site loads. (`docs/*` is on `develop` since PR #15 (`2860acd`)) |

---

## 12. Open questions (need an owner's answer)

1. **Success criteria and dates.** What defines G1 "parity" sign-off, and what are the target go-live dates for Foundation and USTA.com?
2. **usta.com scope.** Which usta.com sections are in scope (it has ~3,088 core pages)? Is there a template catalog or
   sitemap decision? The button survey (MIGRATION.md §3 item 9, 2026-10-11) left out section microsites (WordPress /
   legacy themes: Pacific NW, New England, Colorado…), ustacoaching.com and third-party widgets (Termly, Auth0, forms). It
   also met app features this PRD does not cover: header Join / Sign in (`.v-authentication-button`), site search, Vue
   widgets such as the event calendar, and rankings and yearbook pages. Which are in scope, and are the microsites and
   ustacoaching.com separate sites?
3. **Sites.** Are the four sites (`foundation-dev`, `foundation-com`, `usta-dev`, `usta-com`) created in aem.live / DA
   yet? (Repo and org names are not a requirement: the code is kept in more than one repository.)
4. **Per-site design tokens.** Does usta.com share the Foundation breakpoints, grid, fonts and type scale, or does each
   site get its own? *Partly answered* (MIGRATION.md 2026-10-11): **fonts** shared (usta.com's
   `Graphik-Semibold-App.woff2` is byte-identical to `fonts/graphik-semibold.woff2`); **grid** close but not identical
   (usta.com's AEM grid is `min(our column + 30px, viewport − 30px)`, i.e. 962 / 1170 / 1200 at 992 / 1200 / 1440, where
   ours stops at 1170; measured for button widths only); **header** compact until 1370 (R-S1); **buttons** own stylesheet.
   Still open: usta.com breakpoints and template type scale (R-S1).
5. **Shared profile** for repoless: yes or no? (README says undecided.)
6. ~~**Missing blocks.**~~ **Answered** — see R-B4 and D-051 (Reactions are out of scope).
7. **Typography check.** `check:typography` passes are logged for h1–h4 and body (§5). Which of h5/h6 must be added to
   `typography.json` (YPI authors `<h6>`)?
8. **CI coverage.** Should breakpoint, overflow, typography and svg checks run in CI? Should `build` and `a11y` become
   required status checks? Today no check blocks a merge (§11, "Branch rules are documented but not enforced").
9. **Martech.** *Partly answered* (from branch docs; confirm before Martech 3/4). **IDs:** Target production client
   `unitedstatestennisas`, test client `codeandtheoryamerpar` (`.ema/plan.md` §1 on `aem-coder-branch`, with the IMS org).
   OneTrust domain script `43383d2d-67e6-4d4a-99cb-3ff760b82737`, usta.com's property, reused for ustafoundation on
   branch `one-trust`. **Consent for ustafoundation:** not required (D-047). **Sheet editors:** the two martech admins
   (D-049). **Still open:** named owners for Launch, Analytics, Target and OneTrust (`.ema/plan.md` lists only the roles);
   whether ustafoundation needs OneTrust at all, and with which property; `consentRequired` for usta.com and its regions
   (usta.com today blocks Launch in an opt-in region and is opt-out in the US; the US case is not verified,
   `docs/otautoblock.md` §6 on `one-trust`).
10. **Docs and tools referenced but absent** (not in this repo or its history). Docs: `docs/MIGRATION-SCOPE.md` and
    `catalog/` (MIGRATION.md §2a); `docs/source-css-system.md` (also cited by `styles/styles.css`, `breakpoints.json`,
    `typography.json`); `docs/asset-localization-playbook.md` (`tools/assets/localize-assets.mjs` "Follows … EXACTLY");
    `reference/Final Report USTAFoundation.html` (the 28-block source report). Tools: `tools/content/remove-block.mjs`,
    `staff-list-format.mjs`, `spacer-all-viewports.mjs`. Local-only by design: `migration-work/` (gitignored) and the
    `/tmp` scripts and DA backups. Recreate them, fetch them from the repository they came from, or drop the references?
11. **Akamai.** Who owns fronting the two production domains and the cutover?
12. **Test environments.** Which URLs does QE use for `develop`, and for `uat`? *Partly answered:* the PR template's Before
    link is `https://{base-branch}--foundation-dev--usta-digital.aem.page/{path}`, which implies QE on
    `https://develop--foundation-dev--usta-digital.aem.page/` and UAT on `https://uat--foundation-dev--usta-digital.aem.page/`.
    Still open: does UAT use prod content (`foundation-com`)?
13. **Adobe code drops.** Drops are merged into `main` and `develop` is then rebased and force-pushed (§8.6), but
    MARTECH.md says "After merging a drop into develop" and BRANCHING.md says `main` changes only through a Lead-owned PR
    from `uat`. Which branch should a drop target, and who reviews it (QE? UAT?)? May `develop` ever be rewritten? Who owns
    drops (today one developer commits and merges every one)? How are branches cut from the old `develop` brought back in
    line?
14. **Branch prefixes and hotfixes.** BRANCHING.md allows only `feature/<TicketAndName>`. `a11y.yml` also accepts
    `bugfix/` and `hotfix/`, and history already has `bugfix/git-workflow` (PR #5) and hyphenated `feature/eds-4`,
    `feature/eds-5` (PR #6) and `feature/eds-125`. Are `bugfix/` and `hotfix/` allowed, and from which base? Is there a
    hotfix path into `uat`/`main`, and who opens it?
15. **Issue tracker.** Branches and the log cite `EDS-*` keys (`eds-4`, `eds-5`, `eds-125`, EDS-51, EDS-94). The PR template
    asks for `Fix #<n>` plus a ticket id in the branch name. Where are `EDS-*` tickets kept? Should `Fix #` carry the GitHub
    issue or the EDS ticket? Who owns EDS-94 (footer "KEEP UP WITH US", deferred 2026-10-07)?
16. **Related Articles parity.** (1) *Selection:* on most news pages our cards differ from the source (e.g. Aerie: source =
    Realize the Dream + BHM, EDS = Yonex + Chase; the source also links 9 cards to usta.com `stay-current` pages not in our
    index; in `tags` mode the source applies criteria we cannot rebuild). Is matching it required for T1 sign-off, and may
    cards point to usta.com? (2) *Count:* the source shows **4** cards on 9 news pages and 23 pages author `Max Items: 4`,
    but D-018 caps at 3. Is the cap approved, and by whom?
17. **Related Articles metadata on real pages.** The feed metadata was seeded on the `content/drafts/rusmeen/*` copies and
    live-checked on a branch preview only for the static pages (2026-09-22). Do all `/en/home/news/*` pages now carry the
    corrected metadata (News Tags from the source `data-tags`), and are they published? Is the index `lastModified` filled,
    so the 49 children/asc pages match live?
18. **Pending DA content steps** (user-owned, outward-facing). Have these been done, and in which DA (`aemdemos/foundation-usta`
    or ours, which `da:sync` overwrites from aemdemos)? (1) Re-upload the corrected pages (cards-expand DONATE hrefs,
    cards-profile JPEGs, re-imported home). (2) Upload and publish `impact-societies-one-pager.pdf` and
    `2026-scholarship-program-faq.pdf` with their pages. (3) who-we-are yellow spacer desktop 17 → 32 px. (4) `/` first
    strip: author the token instead of raw `#e2f7ff`. (5) special-funds cards-expand image alts. (6) Rename the Section
    Metadata `background` options in `/.da/library/blocks.json` to `section-*-bg`. (7) Delete the retired
    `custom-widget-reactions` / `custom-content-related-articles` samples and library entries; fix the block library (the
    `widget` example 404s, `custom-form-donate` → `donate-embed`, the hero Banner example has no image).
19. **Redirects.** Source URLs end in `.html`, but EDS serves extensionless routes (`/en/home.html` returns 404), so old
    links and bookmarks break at cutover. The source also 301-redirects some URLs (e.g. news
    `njtl-essay-grant-recipients-2020` → `evert-speaks-on-rally-to-rebuild`, imported as a second page). Do source
    redirects and the `.html` → extensionless mapping go in an EDS redirects sheet or in Akamai (Q11), and who owns the
    redirect inventory?
20. **Heading hierarchy.** N5 asks for one `<h1>` and no skipped levels, but the migration keeps the source structure:
    `our-impact` has 2 `<h1>`; the Chris Evert 50th page has none (its title is an `<h3>`); card titles are `<h4>` under
    `<h2>`; leadership goes h1 → h3. Keep source fidelity and record N5 exceptions, or re-level and re-tune the type
    scale? [MIGRATION.md 2026-09-09, 2026-10-02]
21. **Hidden max-width rules.** `blocks/columns/columns.css` (MIGRATION.md 2026-10-16) insets text-left rows by 15 px only from 992 up
    to 1200 px with `margin-inline: clamp(0px, (1201px - 100vw) * 15, 15px)` inside a `min-width: 992px` query — in effect
    a `max-width: 1200px` rule that `breakpoint-check` cannot see. Is this allowed, or must it be logged as a Breakpoint
    Rule deviation?
22. **Label headings in the typography check.** `check:typography` reports 12 drifts on the `cards-profile-bio` sample:
    the "Board of Directors" label is an `<h3>` styled as an 18/24 Graphik Regular bar, while the source uses `<p><b>`.
    Should the checker exempt a heading that leads `cards (profile, bio)`, or should the label be authored as a `<p>`?
23. **Button marks in real authoring.** Do bold + superscript (dark, D-017) and bold + italic + underline (outline)
    survive save and preview on a page an author builds from scratch in DA? So far verified only on uploaded markup.
24. **Fundraise Up origins and accounts.** `scripts/donate.js` says Foundation's account `AURLRFGR` is domain-restricted,
    so the overlay renders only on allow-listed origins, but MIGRATION.md (2026-09-03, 2026-09-15) records the tab,
    overlay and inline form working on localhost. Which origins does the dashboard allow (QE/UAT previews,
    `foundation-com`, the production domains behind Akamai)? Does USTA.com use Fundraise Up, and with which account?
25. **Feroot.** Is it required, by whom, and on which pages and sites (donate overlay only)? How does it load without
    editing `head.html` under `'strict-dynamic'`: a config/loader row, or a recorded exception to N2? What did the
    synthetic-load test show?
26. **Google Maps / Places (EDS-125).** Which feature, page and site need it (no page uses it; `feature/googleMap` is
    empty)? Who owns the API key? It will be public in the config sheet, so it must be restricted by HTTP referrer.
27. **usta.com vendors.** `docs/usta-consent-usta-com.xlsx` (branch `one-trust`) lists what usta.com runs and each vendor's
    OneTrust category: Launch (Analytics, Target, Audience Manager, Hotjar), GA4/gtag, Google Ads, Google Publisher Tag,
    DoubleClick/Floodlight, Meta Pixel, Simpli.fi, BT/Beeswax, SiteScout, Zendesk chat, AddThis, Quantcast, UsableNet and
    OneTrust; several triggers are "not confirmed". Which must EDS usta.com load (through the loader), and who owns each?
28. **SEO.** Who owns the sitemap, robots rules and page metadata for the EDS sites? The repo has no `helix-sitemap.yaml`
    or robots file (they may live in the site config service; the repo does not say). The source injects its head meta
    with JS, so the importers recover only the Title; the news importer derives Description, Image and Publication Date,
    the others add only `Theme`. So descriptions and share images on non-news pages are EDS defaults. Acceptable, or
    should the importers copy them?
29. **Languages.** Are non-English pages in scope on either site? Only English has been migrated or surveyed (Foundation
    paths are under `/en/`; the usta.com survey cut 12,411 sitemap URLs to 3,388 EN pages), and `loadEager` sets
    `lang="en"` on every page. If another language is in scope, `lang` and UI strings must come from content (N7).
30. **PageSpeed check and the After URL.** `aem-psi-check` (posted by the AEM Code Sync app) passed only on PRs whose
    After URL used the repository's own `<branch>--<repo>--<owner>` host (#5, #6, #13), and failed with "Rejected:
    provide test url" on #9, #10 and #14. No PR has used the `<branch>--foundation-dev--<org>` form the PR template asks
    for. Does the check accept it? If not, should PRs carry a second URL for PSI, or should the template change?
31. **Env selector target and registration (R-A7).** *Partly answered (2026-10-16, D-077):* Go keeps the author's page
    and site and only changes `ref`. Still open: register it with a relative path, so it loads from each branch and is
    missing on a branch without it, or with one absolute `https://<branch>--foundation-dev--usta-digital.aem.live/…` URL?

---

## 13. Reference index

| Topic | Document |
|---|---|
| Setup, environments, architecture | [README.md](../README.md) |
| Rules for agents and the build loop | [AGENTS.md](../AGENTS.md) |
| Running migration log (read first) | [MIGRATION.md](../MIGRATION.md), [MIGRATION.template.md](../MIGRATION.template.md) |
| Decisions taken | [decision.md](decision.md) |
| How things run end to end (page load, martech, donations, news data, authoring, import, release) | [flow.md](flow.md) |
| Architecture: parts, code layout, constraints, repoless plan; diagrams in `docs/assets/` | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Branching | [docs/BRANCHING.md](BRANCHING.md) |
| Martech | [docs/MARTECH.md](MARTECH.md) |
| PR process | [PR_AGENT.md](../PR_AGENT.md), [.github/pull_request_template.md](../.github/pull_request_template.md) |
| Skills index | [skills/README.md](../skills/README.md) |
| Breakpoints / grid | [tools/quality/breakpoints.json](../tools/quality/breakpoints.json) |
| Typography | [tools/quality/typography.json](../tools/quality/typography.json) |
| Validation | [VALIDATION.md](../VALIDATION.md) |
| Buttons panel setup + authoring contract | [tools/plugins/buttons/README.md](../tools/plugins/buttons/README.md) |
| Related Articles feed (partly stale: says 3–4 cards and decorative thumbnails, §11) | [templates/news/RELATED-ARTICLES.md](../templates/news/RELATED-ARTICLES.md) |
| Query indexes | [helix-query.yaml](../helix-query.yaml) |
| a11y URL list, exclusions, disabled rules | [tests/a11y/a11y.config.js](../tests/a11y/a11y.config.js) |
| Import playbook; news fleet scan (2026-09-07) | [skills/content-import/IMPORTING-GUIDE.md](../skills/content-import/IMPORTING-GUIDE.md); [tools/importer/planning/news-fleet-scan.md](../tools/importer/planning/news-fleet-scan.md) |
| Importer template config; known-good importer backups (restore steps) | `tools/importer/page-templates.json`; `tools/importer/backups/<template>/manifest.md` |
| Asset finalize | `tools/assets/localize-assets.mjs` (images), `tools/assets/localize-docs.mjs` (docs; `--base`) |
| Site audits | `tools/quality/audit-site.mjs`, `tools/quality/audit-breadcrumbs-news.mjs`, `tools/quality/audit/` |
| Block-library preview cleanup | `tools/da-library-preview/` |
| Martech + DA hand-over: plan (accounts, IDs, decisions, open items with owners), design, implementation; DA content sync; martech tests (**branch `aem-coder-branch` only**) | `.ema/README.md`, `.ema/plan.md`, `.ema/design.md`, `.ema/implementation.md`; `tools/da-sync/README.md`; `tools/martech-tests/README.md` |
| OneTrust `OtAutoBlock.js` analysis, usta.com consent inventory, consent audit script (**branch `one-trust` only**) | `docs/otautoblock.md`, `docs/usta-consent-usta-com.xlsx`, `tools/consent-audit.js` |
