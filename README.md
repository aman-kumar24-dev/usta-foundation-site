# USTA — Edge Delivery Services

The USTA Foundational code base (sites `foundation-dev` / `foundation-com` and `usta-dev` / `usta-com`: `-dev` is dev content, `-com` is prod content), built on [AEM Edge Delivery Services](https://www.aem.live/) (vanilla JavaScript, no build step). Content is authored in [DA](https://da.live/) and delivered from `aem.live`; this repository holds the code (blocks, scripts, styles) that decorates it.

## Environments

- Dev content (`foundation-dev`): https://main--foundation-dev--usta-digital.aem.page/
- Prod content (`foundation-com`): `https://main--foundation-com--usta-digital.aem.live/` (not live yet: no prod content)
- Feature branch: `https://{branch}--foundation-dev--usta-digital.aem.page/` (branch lowercased, `/` replaced by `-`)

## Branching and environments

Code moves `feature/*` → `develop` (QE) → `uat` (business testing) → `main` (production), by pull
request only. See [docs/BRANCHING.md](docs/BRANCHING.md) for the full strategy, ground rules and
the dev / production flow.

## Architecture

Full detail (parts, code layout, constraints): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Current site

![Current site architecture: visitors, aem.live, browser decoration, martech](docs/assets/current-site.svg)

1. A visitor requests a page over HTTPS; `aem.live` returns the HTML.
2. `aem.js` and `scripts.js` decorate it in three phases: eager (first section), lazy (blocks, header and footer), delayed (martech, about 3 seconds later).
3. Authors edit pages in DA, and the edge publishes them as HTML. The importer tools in `tools/importer` load source-site pages into DA.
4. Code reaches the edge from this GitHub repo through AEM Code Sync.
5. The martech loader reads its settings from the `/configs/site-config.json` sheet. See [docs/MARTECH.md](docs/MARTECH.md).

### Planned: repoless setup for USTAFoundation.com and USTA.com

![Repoless architecture: one GitHub repo feeding the USTA and Foundation sites](docs/assets/repoless-plan.svg)

- One GitHub repo (this one) feeds both sites through Code Sync; the Foundation site is live first and is the canonical one; the USTA site follows.
- Each site has its own DA content source (`<name>-dev` for dev, `<name>-com` for prod) and its own martech config sheet.
- Akamai fronts both production domains.
- Whether to use a shared profile for common settings is still undecided, so none is drawn.
- Background: [Repoless setup](https://www.aem.live/docs/repoless).

## Project structure

```
blocks/     reusable blocks (one folder each: .js + .css)
styles/     global styles, fonts, brand tokens
scripts/    aem.js (never edit), scripts.js, site-config.js, martech/
tools/      importer, quality checks, DA plugins
docs/       PRD, decisions, flows, architecture, branching, martech (diagrams in docs/assets/)
skills/     project best-practice guides (start at skills/README.md)
```

## Local development

1. Install dependencies: `npm install`
2. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
3. Start the dev server: `aem up` (opens `http://localhost:3000`)

## Quality checks

Run these before opening a pull request:

```sh
npm run lint                           # JS + CSS lint
npm run check:breakpoints              # media queries use the agreed breakpoints
npm run check:overflow <url>           # no horizontal overflow at any breakpoint
npm run check:typography <url>         # type scale matches the source site
npm run test:a11y <url>                # axe-core accessibility
```

The dev server must be running for the commands that take a `<url>`.

## Working on this repo

- [AGENTS.md](AGENTS.md) holds the project rules (breakpoints, grid, typography, accessibility, security).
- [MIGRATION.md](MIGRATION.md) is the running migration log.
- Never edit `scripts/aem.js`, `head.html` or `package-lock.json`.

## Documentation

- [Branching strategy and environments](docs/BRANCHING.md)
- [PR agent: how to raise a pull request](PR_AGENT.md)
- [Martech: config sheet, consent and vendor loading](docs/MARTECH.md)
- [Developer Tutorial](https://www.aem.live/developer/tutorial)
- [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
- [Web Performance](https://www.aem.live/developer/keeping-it-100)
- [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)
