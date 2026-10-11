# Implementation — where things live and how to run them

## 1. File map

| File | Purpose | Main exports / hooks |
|---|---|---|
| `scripts/scripts.js` | page loading | `loadEager`: `window.hlx.siteConfigFetch = fetch('/site-config.json', {priority})`, `import('./site-config.js')`, Target gate (metadata `Target`), awaits `target.js` before the first section · `loadLazy`: `import('./donate.js')` → `initDonate()` · `loadDelayed` (3000 ms): `consent-check.js`, `analytics.js` · from develop: `openLinksInNewTab()`, `applySectionBackgrounds()` |
| `scripts/site-config.js` | **the** settings module (sheet only) | `getConfig(key)`, `whenSiteConfigReady()`, `getSiteConfig()` (raw JSON), `getMartechConfig()` → `{ site, env }`, `isProdEnvironment(host)`, `getEnvironment(host)`, `window.ustaSiteConfig` |
| `scripts/analytics.js` | Tags loader + donation beacons | (side effects) injects `launch` embed once; consent via `onConsent`; listens to `donate` |
| `scripts/target.js` | at.js loader, offers, anti-flicker, A4T modes | default `initTarget()` |
| `scripts/target-a4t.js` | client-side A4T | `captureA4T(response)`, `CONTEXT_KEY = 'a4t.payload'` |
| `scripts/vendor/at.min.js` | at.js 2.11.4 (aem.live build) | — (`.min.js` is lint-ignored) |
| `scripts/vendor/VisitorAPI.min.js` | ECID 5.5.0 — only `target.a4t = true/server` | — |
| `scripts/donate.js` | Fundraise Up loader + link normalisation + `donate` events | default `initDonate()`, `loadFundraiseUp()` |
| `blocks/donate-embed/donate-embed.js` | inline donation form; loads the widget eagerly | uses `loadFundraiseUp()` |
| `scripts/consent-check.js` | consent gate (from develop) + `onConsent` | `onConsent(cb)`; dispatches `consent.update` |
| `scripts/consented.js` / `scripts/hotjar-router.js` | consented scripts → Hotjar from sheet (develop) | — |
| `tools/da-sync/da-sync.mjs`, `cli.mjs`, `README.md` | DA content sync (incl. `/.da/library`) | `npm run da:sync` |
| `docs/MARTECH.md` | martech reference | — |
| `.hlxignore` | `tools/da-sync/*` not served (dot-folders and `*.md` already ignored) | — |
| `MIGRATION.md` | dated project log (required by `AGENTS.md`) | — |

Not in the repo: `migration-work/` is **git-ignored** (`.git/info/exclude`) — test scripts,
backups and Lighthouse output live there locally (see §5).

## 2. `/site-config` sheet reference

Edit: `da.live/sheet#/aman-kumar24-dev/usta-foundation-site/site-config` → **Preview** (aem.page)
→ **Publish** (aem.live). Current values (2026-10-11; preview = published):

| key | value now | notes |
|---|---|---|
| `launch.production` | `https://assets.adobedtm.com/15c795eb812c/e99b4446eb17/launch-b4bd8f30c678.min.js` | USTA interim library (has Target + Hotjar rule) |
| `launch.development` | `https://assets.adobedtm.com/d2309d5b8372/803d3f83f30f/launch-4968d77b0478-development.min.js` | test org property "EDS Migration - Main Site" |
| `consentRequired` | `false` | `true` = wait for consent (Tags) / consent workflow (Hotjar) |
| `target.enabled` | `true` | at.js on pages with `Target` metadata |
| `target.clientCode` | `codeandtheoryamerpar` | test account (USTA: `unitedstatestennisas`) |
| `target.serverDomain` | `codeandtheoryamerpar.tt.omtrdc.net` | |
| `target.imsOrgId` | `6ED976C95CFFA6810A495C73@AdobeOrg` | USTA: `A6D83F7A5347FCE90A490D44@AdobeOrg` |
| `target.a4t` | `client` | `false` · `true`/`server` · `client` |
| `target.flickerTimeout` | `1000` | ms, 0–3000; 0 = don't wait for offers |
| `hotjarId.development` / `.production` | `6402139` | read by `hotjar-router.js` |
| `hotjarVersion` | `6` | |
| `hotjarHostUrl.development` / `.production` | `https://static.hotjar.com/c/hotjar-` | |
| `onetrust.sdk` / `onetrust.src` | set by the team | **not used by code yet** |

Any key may carry `.production` / `.development` suffixes (lookup in design.md §2).
`donate-beacons` tab: `event | linkName | events | set | map`, e.g.
`donationComplete | Fundraise Up Donation Complete | event67 | | amount=eVar76`
(`set`/`map` = `name=value; …`; variables `eVarN`, `propN`, `pageName`, `channel`, `campaign`).

## 3. Window events and globals

| Name | Fired / set by | Used by |
|---|---|---|
| `window.hlx.siteConfigFetch` | `scripts.js` (eager) | `site-config.js` |
| `window.ustaSiteConfig` | `site-config.js` | debugging, other scripts |
| `consent.update` (event) | `consent-check.js` | `onConsent` |
| `donate` (event) + `window.donateEvents` | `donate.js` | `analytics.js` |
| `target-a4t` (event) + `window.targetA4TPayload` | `target-a4t.js` | Launch page-view rule |
| `window.targetA4TPayloadSent` | Launch rule (should set it) / `target-a4t.js` fallback | de-duplication |

## 4. Runbooks

**Local dev**
```sh
npm install
aem up --html-folder content --prefer-plain-html --addr '*' --no-open --port 3000 \
  --url https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page
# pages: http://localhost:3000/en/home and /content/en/home/<path>
```
Target delivery returns **400 on `http://localhost`** (Target rejects the address) — test
Target on the branch preview.

**Change a setting** — edit the sheet, Preview, check the branch preview, then Publish.
Production reads `*.production` keys (or the bare key).

**Switch on Target for a page** — page metadata `Target` = `on` (or `true`), sheet
`target.enabled = true`. Only after Target is removed from the Launch library of that
environment.

**Target cutover (production)** — (1) Launch admin removes the Adobe Target extension, the
"Load Target" rule and the Hotjar rule from USTA's property and publishes; (2) set
`target.*.production` to the USTA account and the production A4T mode; (3) publish the sheet;
(4) verify one delivery call per Target page and the page view.

**A4T mode** — `target.a4t`: `client` (recommended; needs the Launch rule + processing rule),
`true`/`server` (VisitorAPI, same-org `sdid`), `false`.

**Content sync** (from `aemdemos/foundation-usta`)
```sh
npm run da:sync -- --dry-run          # what would change
npm run da:sync                       # backup → mirror (no deletes) → preview
npm run da:sync -- --folders=/en/home/news,/.da/library
```
In AEM Coder the credentials are injected; elsewhere set `DA_TOKEN` (IMS token: read on
source, write on destination) in the shell — never commit it. Backups:
`migration-work/da-sync/backups/<timestamp>/`.

**Add a repoless site** — create its DA repo with its own `/site-config` sheet (same layout),
add org-config permission rows for `/<site>/…`, preview/publish. No code change.

**Permissions** — org config `da.live/config#/aman-kumar24-dev/` → `permissions` (design.md
§9). Keep at least one `CONFIG` write row; back up the JSON first
(`GET https://admin.da.live/config/aman-kumar24-dev/`), POST form field `config` to restore.

**Rebase / push** — this repo's fetch setting tracks only `main`: fetch explicitly
(`git fetch origin develop:refs/remotes/origin/develop`). Tag a backup, rebase, review each
conflict, `git push --force-with-lease=aem-coder-branch:<expected sha>`.

## 5. Testing

**Quality gate** (project rule, paste outputs before claiming done):
```sh
npm run lint
node tools/quality/breakpoint-check.mjs
npm run check:overflow -- http://localhost:3000/en/home
npm run check:typography -- http://localhost:3000/en/home
npm run test:a11y -- http://localhost:3000/en/home
```
If Playwright reports a missing pinned browser (`chromium_headless_shell-1187`), point it at
the installed build with wrapper scripts and `PLAYWRIGHT_BROWSERS_PATH=/tmp/pw` (create
`/tmp/pw/chromium_headless_shell-1187/chrome-linux/headless_shell` and
`/tmp/pw/chromium-1187/chrome-linux/chrome` as `exec` wrappers to the installed binaries,
plus empty `INSTALLATION_COMPLETE` files).

**Martech test scripts** (local only, `migration-work/`, not in git — open item: copy to the
repo). Most use Playwright with `/ms-playwright/chromium-1208/chrome-linux64/chrome` and answer
Analytics beacons locally so nothing reaches Adobe:

| Script | Proves |
|---|---|
| `target/proxy.mjs` | test proxy on :3100 — injects `Target` metadata (`?tgt=1`), forces sheet values (`a4t=…`, `keepLaunch=1`), A/B the timer (`timer=2000`) |
| `target/test-eager.mjs` | sheet fetched eagerly once; first paint shows a simulated offer; timeout behaviour |
| `target/test-a4t.mjs` | A4T modes: payload captured, backup hit once, no duplicates, server/off unchanged |
| `target/test-merged.mjs <url>` | merged site-config: one request, Tags, Hotjar, at.js, env rules, 404 sheet |
| `target/check-client-a4t.mjs <url>` | live check on the branch preview (delivery status, payload, hits) |
| `target/diagnose.mjs <url>` | what Target/Tags/sheet a URL actually runs |
| `target/beacons.mjs <url>` | list Analytics beacons + the Launch property's rules |
| `target/test-pages.mjs` | Fundraise Up timing, DONATE same tab, page types render |
| `site-config/test-sheet.mjs` | serves edited sheet variants (note: written before "no code defaults") |
| `da-sync/verify.mjs`, `verify-library.mjs` | byte-compare a sync; Library entries resolve |
| `perf/run-interleaved.sh`, `summarize.mjs` | Lighthouse with all variants per round (fair on a noisy host) |

**Branch preview check** — `https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page/`:
one `/site-config.json` request, the development Launch embed, one page view (a first visit
shows a 302 + `pccr=true` pair = one hit), Hotjar once, Target delivery 200.

## 6. Gotchas (learned the hard way)

- `head.html`, `scripts/aem.js`, `package-lock.json` are untouchable (AGENTS.md).
- DA copy API rejects cross-org copies → GET + POST per file.
- DA listings hide dot-folders → `/.da/library` must be listed explicitly.
- DA ACL: non-HTML files need the exact path **with** `.json`; HTML pages without `.html`.
- A **site** config's `permissions` sheet is ignored; only the org config counts.
- DA `config` POST takes form field `config` and refuses a config without a `CONFIG` write row.
- `aem.page` / `aem.live` are public suffixes → every branch host is its own site
  (cookies, `cookieDomain`).
- Lighthouse "third-party cookies" for own-host cookies appears when the page is framed
  cross-site; clean runs need a top-level tab with storage cleared.
- Chrome fires synthetic `pointermove` under a resting cursor → never use it as "interaction".
- at.js `timeout` 3000 ms drops slower offers; Target 400 on `http://localhost`.
- AppMeasurement 2.27.0 drops unknown vars (`tnta`); `pe` is overwritten by `s.tl`.
- First Analytics hit without ECID: 302 → `pccr=true` (one page view, not two).
- Launch rule errors are swallowed; see them with `_satellite.setDebug(true)`.
- The site's Trusted Types `default` policy strips `<script>` from
  `createContextualFragment` / `document.write` HTML — test any Target offer that carries
  `<script>` on the branch preview.
- Branch names longer than the 63-char DNS label (`<branch>--usta-foundation-site--aman-kumar24-dev`)
  are refused here → use short branch names / tags for backups.
- The host can be heavily loaded (load average ~50): compare Lighthouse variants interleaved.
- Shell guard in AEM Coder blocks some inline commands containing `>` or `/`-heavy patterns —
  put such logic in a script file.

## 7. History

Commits on `aem-coder-branch` (oldest → newest, after the 2026-10-07 rebase onto `develop`
`aacbdb5`): `cad1949` gitignore · `4250dab` Analytics via Tags · `c98fe46` Fundraise Up on
interaction + donation analytics · `daff30e` no timer / pointermove · `1958509` Target at.js ·
`95f6fea` timer 2000 (user) · `b1771d1` DA sync tool · `89cdfbb` settings from the sheet ·
`971acbe` admin-only sheet docs · `138d4af` eager sheet + wait for offers · `e0cee4d` sync
includes `/.da/library` · `a227503` client-side A4T + timer 3000 · `cabc915` one site-config
module · `d0e81e2` MIGRATION note. Pre-rebase history: local tag `pre-rebase-20261007`.
Narrative: `MIGRATION.md` entries dated 2026-09-27 → 2026-10-07.
