# AGENTS.md

This project is a website built with Edge Delivery Services in Adobe Experience Manager Sites as a Cloud Service. As an agent, follow the instructions in this file to deliver code based on Adobe's standards for fast, easy-to-author, and maintainable web experiences.

---

## Skills — read before you build

This project keeps its best practices as **skills** under `skills/`. Each skill is a directory with a `SKILL.md`; `skills/README.md` is the single source of truth for lookup.

**Before any task:** scan the "Load when…" column in `skills/README.md`; if a trigger matches your situation, read that skill in full before writing code. Load skills on demand when the trigger fires — not speculatively. After solving something non-obvious or being corrected, propose capturing it as a new/updated skill (see `skills/writing-skills`).

## Rules (non-negotiable)

These load-bearing rules are enforced by skills and by deterministic checkers. Skills extend them; they never override them.

- **The Breakpoint Rule (lift-and-shift).** This project migrates sites to Edge Delivery **quickly** — a lift-and-shift. So we **adopt the source site's existing breakpoints**, not a set of our own. **Decide once, per migration, up front — never re-litigate per task or per developer:**
  1. At the start of a migration, discover the customer site's breakpoints from its CSS. Sample a **couple of representative pages, starting with the homepage**: `npm run discover:breakpoints -- https://customer-site.com https://customer-site.com/another-page --write`. Review the detected `min-width` values, then persist them.
  2. This records the agreed set in **`tools/quality/breakpoints.json`** — the **single source of truth** for the whole repo. Every developer and the checker read it from there, so the decision is remembered and never repeated.
  3. **If no breakpoints are accessible** (source CSS unavailable/unreadable), fall back to the boilerplate defaults **`600px`, `900px`, `1200px`** — which is exactly what `breakpoints.json` ships with.
  Still **mobile-first, `min-width` only** (or range syntax `width >= …`): base styles target mobile, media queries layer up; **never mix `min-width` and `max-width`**. Whatever set is in `breakpoints.json` is enforced by `node tools/quality/breakpoint-check.mjs` — run after any CSS change. → `responsive-breakpoints`
- **The Grid Rule (section/content width).** Section and content width comes from **ONE shared 12-column grid** — never ad-hoc per-block percentages. Most source sites lay every page on a single 12-col grid (a `.breakpoint`-style container with a fixed column gap) and position content by **column span** (`col-4-9`, `col-2-11`, with breakpoint variants). Reproduce that: the centered container exposes `--grid-gap`; use the shared `.grid-12` + `.grid-col-*` utilities in `styles.css` (or the same `grid-column` spans) so **every indented section lands on the same grid lines across all viewports**. Two sections that should align MUST use the same span — if you're writing a bespoke `width: 52%; margin-left: 25%`, stop and use the grid instead. Full-bleed is the sanctioned exception: use the generic section styles **`full-width` / `full-width-left` / `full-width-right`** to stretch *any* block to the viewport edge(s) — these are block-agnostic; a block's own layout (e.g. `columns.media-left/right`) stays inside the block. Enforced by `npm run check:overflow` (loads each page at the mobile baseline + every breakpoint + wide desktop and fails on horizontal overflow — the tell-tale of content that escaped its column). → `grid-system`, `full-width-escape-hatch`, `responsive-breakpoints`
- **The Typography Rule (lift-and-shift).** Typography must **match the source site**: the same `h1..h6` and body **font-size, line-height, weight, and family — at every breakpoint** — and the **same font faces, self-hosted**. Discover the source's type scale + `@font-face` once, up front, from the live rendered DOM: `npm run discover:typography -- https://source-site.com --write` records `tools/quality/typography.json`; download each source font into `fonts/` and wire it in `styles/fonts.css` (with a fallback-metrics face; verify licensing before committing binaries). Set the scale as **global tokens** in `styles.css`/`styles/brand.css` `:root` (per breakpoint) applied to `h1..h6`/body **once** — never ad-hoc `font-size`/`font-family` per block. Enforced by `npm run check:typography` (loads the migrated pages at every breakpoint and fails if computed `h1..h6`/body values drift from the record). → `typography-system`, `responsive-breakpoints`
- **The Alt-Text Rule.** Every content image MUST have descriptive `alt`; decorative images MUST use `alt=""` (empty, not missing). Enforced by `npm run test:a11y <url>` (axe-core), which fails on missing alt. → `accessibility`
- **The No-Build Rule.** Zero runtime dependencies, no build step, no frameworks. Native ES modules. Always use `.js` in imports. → `eds-code-conventions`
- **The Untouchable-Files Rule.** Never modify `scripts/aem.js`, `head.html`, `package-lock.json`, or `node_modules/`. New utilities → `scripts/scripts.js`, never `aem.js`.
- **The Block-Isolation Rule.** Every block CSS selector scoped to the block (`.{blockname} .part`); no `nth-child` for logic; avoid `!important` (use the `.full-width` escape hatch). → `eds-code-conventions`, `full-width-escape-hatch`
- **The Security Rule.** Client-side code is public. Never commit secrets. Never use `eval`/`new Function`. Validate external input. Sanitize author/external HTML with DOMPurify before `innerHTML`. → `security`
- **The Localization Rule.** No hard-coded user-facing strings — source from content or make data-driven. → `eds-code-conventions`
- **The Content-Import Rule.** Import a source site's pages with a **profile-driven, hash-free, selector-based importer built ONCE per page-template** (not per page) — never hand-edit `content/` to *create* blocks/HTML. Match blocks on **stable semantic selectors, most-portable-first**; use per-page **hash** selectors only for section breaks/metadata — never to match a block. Reuse first (a DEFAULT profile auto-imports; twins share a profile); add a new parser only for a genuinely new variant. Per page: measure the live DOM → profile → bundle → import → **finalize assets** (docs → `content/assets/docs/…`, inline images → `content/media-da/…`, doc links rewritten to **absolute** `…aem.live/assets/docs/…`) → verify → visual-parity → back up the known-good script/manifest → log it. Completeness <~90% is expected — verify by eye. DA publishing is outward-facing — **on request only**. → `content-import`
- **The Migration-Log Rule.** Keep a living **`MIGRATION.md`** at the project root — the project's running memory, so anyone (human or agent) can pick up the work without re-deriving what was already learned. On the **first task**, if it doesn't exist, seed it by copying **`MIGRATION.template.md`** → `MIGRATION.md`. Then **append as you go** — every time you build or change a **block, template, section, or global script (martech and config rows included)**, and whenever you solve something non-obvious or are corrected, add to it *before* claiming that task done (this is part of the build loop, not an afterthought). Record: the **discovered design system** (breakpoints, the grid/section system, tokens, fonts — cross-link `tools/quality/breakpoints.json`); **per-template and per-section details** (structure, authoring model, section styles; each decision as a one-line `D-xxx` link to `docs/decision.md`); **block variants** and their authoring contracts; **non-obvious fixes, gotchas, and dead ends**; and any **deviation from a rule** (its justification is a `D-xxx` entry; link it). Newest dated entry at the bottom. The live `MIGRATION.md` is **project-specific — never copied between projects** (only `MIGRATION.template.md` is shared), like `PROJECT-*.md`.
- **The Project-Docs Rule.** Four living docs in `docs/` sit beside `MIGRATION.md`, each with one job: **`docs/PRD.md`** (what the product must do, with a status per requirement, plus risks and open questions), **`docs/decision.md`** (why — every choice someone would otherwise re-open), **`docs/flow.md`** (how things run now, step by step) and **`docs/ARCHITECTURE.md`** (the parts, sites, hosts and code layout). Keep them true **in the same task and PR as the change**, *before* claiming it done. A change that does not come through your own PR (an answer from the user or customer, an Adobe drop into `main`, a Lead's promotion, another developer's merge) is written up in the next `feature/*` → `develop` PR (docs-only if nothing else is pending), citing the PR, commit or date that made it.
  1. **`docs/PRD.md`** — when scope, a requirement or its status changes, or you find a new risk or open question. Write the status as it will stand once your PR merges, with its source (`PR #n`, file:line, commit or MIGRATION.md entry): **Done / In progress / Planned / TBD**, plus *branch only* for code not yet on `develop`. When code reaches `develop`, `uat` or `main`, also fix the *branch only*, *on `develop` only* and *not on `main`* tags it carries. Mark a closed risk **Resolved.** An unknown that needs an owner's answer is **TBD** with a §12 question. When a §12 question is answered, keep its number, strike its title and write **Answered** — see D-xxx (like Q6); if only part is settled, write *Partly answered* plus a *Still open:* line (like Q4). A choice goes in `decision.md`; a plain fact goes, with its source, in the PRD section it belongs to. Bump *Last updated*.
  2. **`docs/decision.md`** — when a choice between options is made (by the user, the customer, a Lead, or you within an approved plan). Add the next `D-xxx` row at the bottom of the index, and its detail block under the matching topic heading in *Decision details* (never after the *Superseded or reverted* table) with *Why:*, *Decided by:* and *Source:* (an answer given in chat is `user, YYYY-MM-DD`; an unknown is `n/d`). **Never edit a past entry's decision or why:** a changed or reverted decision gets a new entry, the old entry's index status becomes `Superseded by D-xxx` (or `Reverted`), and a row goes in the *Superseded or reverted* table; a factual fix gets a dated *Correction* note. The index *Status* column is live: update it when the state changes (e.g. drop `(branch only)` once the code is on `develop`) and add a dated note to the detail block.
  3. **`docs/flow.md`** — when a change alters how a flow runs, for example a page-load phase or hook, the order of `decorateMain()`, a site-config tab, row type or martech module, a metadata key (also list it in the authoring flow's Metadata step) or query-index field, an authoring tool, an import step, a release lane or CI check, or a value, default or limit a step states (`MAX_LIMIT`, the 3 s timer). Update every flow that shows it, the §0 system map included: the steps (anchor code refs on the function name; give a line number only after re-checking it), the Mermaid diagram (every node and edge label in double quotes; no `#` or `;` inside labels; planned or branch-only nodes take `:::planned`, removed once the code is on `develop`) and the *Planned* and *Gotchas* lists; bump *Last updated*. A decided but unbuilt change goes in that flow's *Planned* list. When a file the flows cite is replaced wholesale (e.g. by an Adobe drop), re-trace every step that cites it.
  4. **`docs/ARCHITECTURE.md`** — when a part, site, host or the code layout changes (a new top-level folder, a new script under `scripts/`, a new vendor, a new site, the CDN in front). Keep the diagram file names in `docs/assets/`: README, `docs/BRANCHING.md` and `docs/MARTECH.md` embed them.

  For every update, first `grep -n` all four files for each file, function, metadata key, vendor, block and `D-` / `R-` / `§12 Q` id the change touches, and fix every hit: one feature usually sits in several PRD sections, flows and decisions. Do any PRD §11 mitigation that says "in the next … PR". Where a PRD row or a flow defers detail to a topic doc (`docs/MARTECH.md`, `docs/BRANCHING.md`, `templates/news/RELATED-ARTICLES.md`, `tools/plugins/buttons/README.md`), update that doc in the same PR. Link between the files instead of copying (`D-041`, `PRD §4.6`, `flow.md §2`). Never invent facts. If a change touches none of them, write "Project docs: none affected" in the PR Summary.
- **Verify before claiming done.** Before writing "done"/"fixed"/"implemented", you MUST run the full quality gate and **paste the actual command output** for each — a completion claim without shown output is invalid:
  1. `npm run lint`
  2. `node tools/quality/breakpoint-check.mjs`
  3. `npm run check:overflow <url>` — for any section/content-width or layout change (needs the dev server up; fails on horizontal overflow — see `grid-system`).
  4. `npm run check:typography <url>` — for any typography/global-CSS change (needs the dev server up; fails if h1..h6/body drift from the source scale at any breakpoint — see `typography-system`).
  5. `npm run check:svg` — when any SVG under `icons/` was added or changed (flags oversized SVGs; rasterize with `npm run convert:svg` — see `svg-assets`).
  6. `npm run test:a11y <url>` — for any UI/CSS change (needs the dev server up + deps installed; if it genuinely cannot run, say so explicitly and run the others).

  Then confirm the change visually at `localhost:3000`, review the diff for dead code, and update `MIGRATION.md` and the `docs/` files the change affects (The Migration-Log and Project-Docs Rules). If any check fails, fix it and re-run — this is a loop, not a one-shot report. Never assert a pass from memory. → `verify-before-claiming`, `quality-tooling`

---

## Discover the source's design system FIRST (do this once, up front)

A perfect lift-and-shift depends on capturing the source site's **global design system** before building any block — the same values recur on every page, so measure them once and record them as the single source of truth. Sample a **couple of representative pages, starting with the homepage**, from the *live rendered DOM* (computed styles), not just static HTML (many sites lazy-load/JS-inject). Record what you find so it's never re-litigated:

1. **Breakpoints** → `tools/quality/breakpoints.json` (see The Breakpoint Rule). `npm run discover:breakpoints`.
2. **Layout container & grid** → the max content width, the side gutter (at each breakpoint), the **column count + column gap** of the master grid, and the common **column spans** content sits on (e.g. `col-4-9` intros, `col-2-11` rows). This drives The Grid Rule; store the gap as `--grid-gap` and build the `.grid-*` utilities. Measure the alignment of breadcrumb, hero, and a couple of body sections to confirm the grid lines.
3. **Design tokens** → colours (brand green, accent gold, greys, band backgrounds), the **type scale** (heading + body font-sizes/weights/line-heights *per breakpoint*), spacing rhythm, border-radius, and shadows. Put them in `styles/brand.css` / `:root` — don't hardcode per-block. Capture the type scale + fonts with `npm run discover:typography` → `tools/quality/typography.json`, self-host the source `@font-face` in `fonts/`, and enforce with `npm run check:typography`. → `typography-system`
4. **Recurring section patterns** → full-bleed bands, gray/green/colour bands, indented-intro bands, alternating media+text. Model these as **section styles** (generic, block-agnostic) rather than baking them into blocks.
5. **Site-wide affordances** → link/CTA/button styles (incl. hover), the download-link treatment, the yellow-bar-under-heading pattern, icons. Decorate these globally (in `scripts.js` + `styles.css`), not per block.
6. **Fonts** → family names + `@font-face`/fallback metrics.

Rule of thumb: **if a value appears on more than one page or more than one block, it's a global token/system — capture it centrally, never per-block.** Per-block CSS should only hold what's genuinely unique to that block.

---

## Project Overview

This project is based on the https://github.com/adobe/aem-boilerplate/ project and set up as a new project. You are expected to follow the coding style and practices established in the boilerplate, but add functionality according to the needs of the site currently developed.

The repository provides the basic structure, blocks, and configuration needed to run a complete site with `*.aem.live` as the backend.

### Key Technologies
- Edge Delivery Services for AEM Sites (documentation at https://www.aem.live/ – search with `site:www.aem.live` to restrict web search results)
- Vanilla JavaScript (ES6+), no transpiling, no build steps
- CSS3 with modern features, no Tailwind or other CSS frameworks
- HTML5 semantic markup generated by the aem.live backend, decorated by our code
- Node.js tooling

## Setup Commands

- Install dependencies: `npm install`
- Start local development: `npx -y @adobe/aem-cli up --no-open --forward-browser-logs` (run in background, if possible)
  - Install the AEM CLI globally by running `npm install -g @adobe/aem-cli` then `aem up` is equivalent to the command above
  - The dev server runs at `http://localhost:3000` with auto-reload. Open it in playwright, puppeteer, or a browser. If none are available, ask the human to open it and give feedback.
- Run linting before committing: `npm run lint`
- Auto-Fix linting issues: `npm run lint:fix`

## Project Structure

```
├── blocks/          # Reusable content blocks
    └── {blockname}/   - Individual block directory
        ├── {blockname}.js      # Block's JavaScript
        └── {blockname}.css     # Block's styles
├── styles/          # Global styles and CSS
    ├── styles.css          # Minimal global styling and layout for your website required for LCP
    ├── lazy-styles.css     # Additional global styling and layout for below the fold/post LCP content
    └── fonts.css           # Font definitions
├── scripts/         # JavaScript libraries and utilities
    ├── aem.js           # Core AEM Library for Edge Delivery page decoration logic (NEVER MODIFY THIS FILE)
    ├── scripts.js       # Global JavaScript utilities, main entry point for page decoration
    └── delayed.js       # Delayed functionality such as martech loading
├── docs/            # Project docs, kept current per The Project-Docs Rule
    ├── PRD.md          # Requirements with status, risks, open questions
    ├── decision.md     # Decision log (D-xxx), append-only
    ├── flow.md         # End-to-end flows with Mermaid diagrams
    ├── BRANCHING.md    # Branching and release
    ├── MARTECH.md      # Martech config sheet and loader
    ├── ARCHITECTURE.md # Components, code layout, repoless plan
    └── assets/         # Diagrams (SVG) used by the docs and README
├── fonts/           # Web fonts
├── icons/           # SVG icons
├── head.html        # Global HTML head content
└── 404.html         # Custom 404 page
```

## Code Style Guidelines

### JavaScript
- Use ES6+ features (arrow functions, destructuring, etc.)
- Follow Airbnb ESLint rules (already configured)
- Always include `.js` file extensions in imports
- Use Unix line endings (LF)

### CSS
- Follow Stylelint standard configuration
- Use modern CSS features (CSS Grid, Flexbox, CSS Custom Properties)
- Maintain responsive design principles
  - Declare styles mobile first, use `min-width` media queries only. The breakpoint *values* are the source site's set recorded in `tools/quality/breakpoints.json` (defaults 600/900/1200 when none discovered). Never mix `min-width` and `max-width`. Enforced by `node tools/quality/breakpoint-check.mjs` (see The Breakpoint Rule and `responsive-breakpoints`).
- Ensure all selectors are scoped to the block.
  - Bad: `.item-list`
  - Good: `.{blockname} .item-list`   
- Avoid classes `{blockname}-container` and `{blockname}-wrapper` as those are used on sections and could be confusing.

### HTML
- Use semantic HTML5 elements
- Ensure accessibility standards (ARIA labels, proper heading hierarchy)
- Follow AEM markup conventions for blocks and sections

## Key Concepts

### Content

CMS authored content is a key part of every AEM Website. The content of a page is broken into sections. Sections can have default content (text, headings, links, etc.) as well as content in blocks.

If no authored content exists to test against, you can create static HTML files in a `drafts/` folder at the project root. Pass `--html-folder drafts` when starting the dev server. Follow the aem markup structure and save files with `.html` or `.plain.html` extensions.

Background on content and markup structure can be found at https://www.aem.live/developer/markup-sections-blocks and https://www.aem.live/developer/markup-reference respectively.

You can inspect the contents of any page with `curl http://localhost:3000/path/to/page`, `curl http://localhost:3000/path/to/page.md`, and `curl http://localhost:3000/path/to/page.plain.html`

### Blocks

Blocks are the re-usable building blocks of AEM. Blocks add styling and functionality to content. Each block has an initial content structure it expects, and transforms the html in the block using DOM APIs to render a final structure. 

The initial content structure is important because it impacts how the author will create the content and how you will write your code to decorate it. In some sense, you can think of this structure as the contract for your block between the author and the developer. You should decide on this initial structure before writing any code, and be careful when making changes to code that makes assumptions about that structure as it could break existing pages.

The block javascript should export a default function which is called to perform the block decoration:

```
/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // 1. Load dependencies
  // 2. Extract configuration, if applicable
  // 3. Transform DOM
  // 4. Add event listeners
}
```

Use `curl` and `console.log` to inspect the HTML delivered by the backend and the DOM nodes to be decorated before making assumptions. Remember that authors may omit or add fields to a block, so your code must handle this gracefully.

Each block should be self-contained and re-useable, with CSS and JS files following the naming convention: `blockname.css`, `blockname.js`. Blocks should be responsive and accessible by default.

### Auto-Blocking

Auto-blocking is the process of creating blocks that aren't explicitly authored into the page based on patterns in the content. See the `buildAutoBlocks` function in `scripts.js`.

### Three-Phase Page Loading

Pages are progressively loaded in three phases to maximize performance. This process begins when `loadPage` from scripts.js is called.

* Eager - load only what is required to get to LCP. This generally includes decorating the overall page content to create sections, blocks, buttons, etc. and loading the first section of the page.
* Lazy - load all other page content, including the header and footer.
* Delayed - load things that can be safely loaded later here and incur a performance penalty when loaded earlier

## Testing & Quality Assurance

### Performance
- Follow AEM Edge Delivery performance best practices https://www.aem.live/developer/keeping-it-100
- Images uploaded by authors are automatically optimized, all images and assets committed to git must be optimized and checked for size
- **SVG assets (enforced):** keep committed SVGs small — `npm run check:svg` flags any `icons/*.svg` over budget (warn > 8KB, fail > 40KB). A large/illustrative SVG usually ships smaller and renders identically as a rasterized 2x PNG; convert with `npm run convert:svg <page.plain.html>`. Small UI glyphs stay as SVG. See `skills/svg-assets`.
- Use lazy loading for non-critical resources (`lazy-styles.css` and `delayed.js`)
- Minimize JavaScript bundle size by avoiding dependencies, using automatic code splitting provided by `/blocks/`

### Accessibility
Meet **WCAG 2.1 AA** (the a11y test enforces 2.0–2.2 A+AA). Full guidance in `skills/accessibility`.
- **Alt text (enforced):** every content image has descriptive `alt`; decorative images use `alt=""` (empty, not missing). See The Alt-Text Rule.
- Valid heading hierarchy — one `<h1>`, no skipped levels.
- Full keyboard operation; visible `:focus-visible` on every interactive element (never bare `outline: none`). Design all interactive states, not just hover.
- Contrast ≥ 4.5:1 (3:1 large text); UI/focus indicators ≥ 3:1. No color-only or hover-only cues. Real `<label>` on form fields (a placeholder is not a label).
- Usable at 320px width and 200% zoom; touch targets ≥ 44×44px.
- **Verify:** `npm run test:a11y <url>` (axe-core) before claiming any UI work done — fix all critical/serious violations.

## Deployment

### Environments

Your local development server at `http://localhost:3000` serves code from your local working copy (even uncommitted code) and content that has been previewed by authors. You can access this at any time when the development server is running.

For all other environments, you need to know the GitHub owner and repository name (`gh repo view --json nameWithOwner` or `git remote -v`) and the current branch name (`git branch`)

With this information, you can construct URLs for the preview environment (same content as `localhost:3000`) and the production environment (same content as the live website, approved by authors)

- **Production Preview**: `https://main--{repo}--{owner}.aem.page/`
- **Production Live**: `https://main--{repo}--{owner}.aem.live/`
- **Feature Preview**: `https://{branch}--{repo}--{owner}.aem.page/`

### Branching strategy

Code moves one way through four branches, each mapped to an environment. Full detail: `docs/BRANCHING.md`.

`feature/*` (local) → `develop` (QE env) → `uat` (UAT env) → `main` (production)

- **No direct commits** to `develop`, `uat` or `main` — pull requests only.
- Branch `feature/<TicketAndName>` off `develop`. After `feature/` the name is **one word** (no hyphens or spaces), e.g. `feature/EDS5hotjarintegration`.
- **Rebase** the feature branch on `develop` before raising a PR.
- **Code only moves forward**: `develop` → `uat` → `main`. Never merge `uat` or `main` into a feature branch.
- PR owners: the developer opens `feature/*` → `develop`; **Leads** open `develop` → `uat` and `uat` → `main`. An agent never opens a PR into `uat` or `main` unless the user asks.

### Publishing Process
1. Create a feature branch from `develop` and push your changes to it
2. AEM Code Sync automatically processes changes making them available on feature preview environment for that branch
3. Run a PageSpeed Insights check at https://developers.google.com/speed/pagespeed/insights/?url=YOUR_URL against the feature preview URL and fix any issues. Target a score of 100
4. Rebase on `develop`, then open a pull request into `develop` (follow `PR_AGENT.md`, which fills in `.github/pull_request_template.md`)
   1. in the PR description, include a link for **each site that has content** (`foundation-dev` now; `foundation-com`, `usta-dev` and `usta-com` once they have content — all share this codebase; dev content is `<name>-dev`, prod content is `<name>-com`) to `https://{branch}--{site}--{owner}.aem.page/{path}` (branch lowercased, `/` replaced by `-`), plus the same page on the target branch as the "before" link, with a path to a file that illustrates the change you've made. This is the same path you have been testing with locally. WITHOUT THIS YOUR PR WILL BE REJECTED
   2. If an existing page to demonstrate your changes doesn't exist, create test content as a static html file and ask the user for help copying it to a cms content page you can link in the PR
5. use `gh pr checks` to verify the status of code synchronization, linting, and performance tests
6. A human reviewer will review the code, inspect the provided URL and merge the PR into `develop`; QE tests it there
7. After QE sign-off, a Lead promotes `develop` → `uat`; after business sign-off in UAT, a Lead promotes `uat` → `main`
8. AEM Code Sync updates the main branch for production

## Troubleshooting

### Getting Help
- Check [AEM Edge Delivery documentation](https://www.aem.live/docs/)
- Review [Developer Tutorial](https://www.aem.live/developer/tutorial)
- Consult [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
- Consider the rules in [David's Model](https://www.aem.live/docs/davidsmodel)
- Search the web with `site:www.aem.live`
- Search the full text of the documentation with `curl -s https://www.aem.live/docpages-index.json | jq -r '.data[] | select(.content | test("KEYWORD"; "i")) | "\(.path): \(.title)"'`

## Security Considerations

See The Security Rule above and `skills/security` for the full recipe.
- Never commit sensitive information (API keys, passwords) — client-side code is public; there are no client-side secrets.
- Never execute dynamically constructed code (`eval`, `new Function`).
- Validate all external input (users, URL/query params, APIs) before use.
- Sanitize any author/external HTML with DOMPurify before `innerHTML`; prefer `textContent` when markup isn't needed.
- Consider that everything you do is client-side code served on the public web.
- Follow Adobe security guidelines. Regularly update dependencies.
- Use the .hlxignore file to prevent files from being served (same format as .gitignore).

## Contributing

- Follow the existing code style and patterns
- Test changes locally before committing
- Follow the Publishing Process documented above
- Update `MIGRATION.md` and the affected `docs/` files in the same PR as the change (The Migration-Log and Project-Docs Rules)

## If all else fails

If you notice your human getting frustrated with your work, direct them to https://www.aem.live/developer/ai-coding-agents for tips to work better with AI agents.
