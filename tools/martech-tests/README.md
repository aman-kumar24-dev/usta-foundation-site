# Martech test scripts

Manual test and diagnostic scripts for the martech, site-config and DA tooling work (Adobe Tags
/ Analytics, Target + A4T, Hotjar, Fundraise Up, `/site-config` sheet, DA sync). They print JSON
or tables for a person to read — they are **not** a CI suite and do not assert. Background:
`.ema/design.md`, `.ema/implementation.md`, `docs/MARTECH.md`.

Not served on the site (`.hlxignore`); output goes to `tools/martech-tests/out/` (git-ignored).

## Setup

```sh
npm install                       # @playwright/test (+ its Chromium via postinstall)
aem up --html-folder content --prefer-plain-html --no-open --port 3000 \
  --url https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page
node tools/martech-tests/target/proxy.mjs     # only for scripts marked "proxy"
```

| Env var | Default | Use |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | local dev server |
| `PROXY_URL` | `http://localhost:3100` | `target/proxy.mjs` |
| `BRANCH_URL` | `https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page` | live checks |
| `CHROME_PATH` | Playwright's own browser | set when the pinned build is missing |
| `MARTECH_OUT` | `tools/martech-tests/out` | reports, compare.json, backups |
| `DA_TOKEN` | — | IMS token for `admin.da.live` (not needed in AEM Coder; never commit it) |

**Analytics safety:** scripts marked *local beacons* answer `/b/ss/` requests in the browser, so
test hits never reach Adobe. Scripts marked *real hits* (live checks) send real hits to the
report suite of whichever Tags library the URL loads.

## Scripts

### `target/` — Tags, Analytics, Target, A4T, Fundraise Up

| Script | Needs | What it shows |
|---|---|---|
| `proxy.mjs` | dev server | Proxy on :3100. `?tgt=1` adds Target metadata + forces `target.enabled=true` and empty `launch.*`; `&a4t=0\|true\|client`, `&keepLaunch=1`; `?timer=2000` A/B of the delayed timer |
| `test-eager.mjs` | proxy · local beacons | Sheet fetched once, eagerly; a simulated offer is in the **first painted frame**; a slow offer (2 s) paints at the `flickerTimeout` cap; `target.enabled=false` loads no at.js |
| `test-a4t.mjs` | proxy · local beacons | Six A4T cases: client mode with/without the Tags rule, no payload, late payload (one fallback hit), server mode (VisitorAPI, mid/sdid), off |
| `test-merged.mjs [url]` | dev server · local beacons | `site-config.js` end to end: one sheet request, Tags embed, Hotjar, at.js, environment per host, and "sheet 404 → nothing loads, no errors" |
| `test-pages.mjs [paths…]` | dev server · local beacons | Fundraise Up only after interaction, DONATE same tab vs other links, page types render without errors |
| `appmeasurement-vars.mjs [url]` | dev server · local beacons | Why A4T uses `contextData['a4t.payload']`: `s.tnta` is dropped, context data is serialized; when Tags started |
| `check-client-a4t.mjs [url]` | real hits | Live client-A4T check on a Target page (default: branch preview) |
| `diagnose.mjs [url]` | real hits | What a URL runs: Target metadata, sheet `target.*`, at.js/VisitorAPI/Tags, delivery status, sdid |
| `delivery-400.mjs <url>` | local beacons | Target delivery request + response body (a 400 on `http://localhost` is expected) |
| `beacons.mjs <url>` | real hits | Every Analytics beacon (rsid, type, link name, `pccr`, context data) + Tags property, rules, extensions |
| `launch-inspect.mjs <url>` | local beacons | Tags library internals: rules, Analytics settings, page-view rule custom code, debug log, who sent each beacon |

### `site-config/`

| Script | Needs | What it shows |
|---|---|---|
| `test-sheet.mjs [url]` | dev server · local beacons | Behaviour follows edited sheet variants: no `launch.*`, invalid values ignored, `consentRequired=true`, edited donate beacon, 404, `target.enabled=false` |
| `test-branch.mjs [url]` | real hits | Branch preview smoke test: environment, one sheet request, Tags embed, one page view, Hotjar once |

### `da-sync/` (read-only — the sync itself is `npm run da:sync`)

| Script | What it shows |
|---|---|
| `compare.mjs [src] [dst]` | Files newer / only in source or destination (incl. `/.da/library`) → `out/da-sync/compare.json` |
| `backup.mjs [repo]` | Full backup of the destination listed in compare.json → `out/da-sync/backup-<date>/` |
| `verify.mjs [src] [dst]` | SHA-256 compare after a sync (Library sheets differ by design — links rewritten) |
| `verify-library.mjs [dst] [src]` | Library config → sheets → documents resolve; nothing still points at the source |

### `perf/` — Lighthouse 12

| Script | What it does |
|---|---|
| `run.sh <label> [url] [--extended]` | 3× mobile + desktop; `--extended` also observes ~6 s after load (delayed phase) |
| `run-interleaved.sh <mobile\|desktop>` | Normal page (3 s / 2 s timer) and Target page (A4T client / off / server) in rounds — fair on a busy host (needs proxy) |
| `summarize.mjs <label…>` | Medians per mode: perf, BP, FCP, LCP, TBT, CLS, SI, third-party requests/KB/ms, Tags, beacon |
| `inspect.mjs <label> [file]` | Per-run martech resources + failing Best Practices audits; one run's cookies, console errors, bootup |

### `a11y.playwright.config.mjs`

`npm run test:a11y` with `CHROME_PATH` when Playwright's pinned browser is not installed (usage in
the file).

## Notes

- Test Target behaviour on the branch preview, not on localhost (Target rejects `http://localhost`).
- Lighthouse on a loaded machine varies a lot — compare variants from the same interleaved session.
- Downloaded Adobe libraries used while investigating (production/test Launch builds,
  AppMeasurement) are deliberately not kept here; inspect a library live with `launch-inspect.mjs`.
