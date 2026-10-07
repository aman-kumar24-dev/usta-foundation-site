# Martech: Adobe Analytics (Tags) + Adobe Target (at.js)

Implementation method: **Tags with the Adobe Analytics extension** (AppMeasurement,
no Edge Network). A Tags embed (loader) script is injected on every page; the
Analytics extension sends beacons straight to Adobe Analytics.

## How it loads

| File | Role |
|---|---|
| `scripts/site-config.js` | One entry per site: hosts, EDS site names, Tags embed URL per environment, `consentRequired`, OneTrust SDK, optional `donateBeacons` |
| `scripts/analytics.js` | Resolves site + environment from the hostname, gates on consent if required, injects the embed once (`async`); turns `donate` events into link beacons |
| `scripts/consent-check.js` | Loads the USTA OneTrust stub. `onConsent` fires for Performance (`C0002`); `onTargetConsent` fires for Targeting (`C0004`). `?consent=accept` overrides for testing |
| `scripts/scripts.js` → `loadDelayed()` | `import('./analytics.js')` — 3 s after the lazy phase (≈4.4 s after navigation locally), independent of the donate widget. At 2 s Tags fell inside standard Lighthouse runs (BP 96 → 75) |
| `scripts/donate.js` (from `loadLazy()`) | Normalises donate links immediately; loads Fundraise Up on first deliberate interaction (pointerdown/keydown/touchstart/wheel/scroll — no timer, no pointermove) or immediately with `?form=`; re-emits its donation events as a `donate` window event (buffered in `window.donateEvents`) |

### Donation events (Fundraise Up → Analytics)

`donate.js` attaches `FundraiseUp.on('checkoutOpen' | 'donationComplete')` and emits
`{ type, campaignId, campaignName }` / `{ type, amount }`. `analytics.js` replays the
buffer on load, listens for new events, and sends `s.tl(true, 'o', linkName, overrides)`
(overrides only — nothing leaks into later beacons) once the tracker exists.

| Event | Beacon (ustafoundation `donateBeacons`) |
|---|---|
| `checkoutOpen` | "Fundraise Up Donation Checkout Open": event9, pageName `ustafoundation:fundraiseup:DONATE`, prop/eVar61 = campaign id, prop/eVar62 = campaign name (skipped if both empty) |
| `donationComplete` | "Fundraise Up Donation Complete": event67, eVar76 = amount (skipped if no amount) |

Interim de-duplication: the old library still has its own two Fundraise Up rules. They
attach only if `window.FundraiseUp` exists when the library runs (visitor interacted
before ~3s). In that case `analytics.js` leaves post-load events to those rules. Remove
the guard (`tags.handlesDonate`) and the two rules together when the Analytics-only
library ships.

`head.html` is not touched. The CSP (`strict-dynamic`) allows scripts injected by our
nonce'd modules, and the Trusted Types default policy in `scripts.js` lets Tags
custom-code/Hotjar injection through (verified: no CSP/TT errors).

### Host → environment

| Host | Entry matched by | Embed used |
|---|---|---|
| `localhost`, `127.0.0.1` | the entry with `local: true` | `development` |
| `{ref}--{site}--{org}.aem.page` | `{site}--{org}` in `edsSites` | `development` |
| `{ref}--{site}--{org}.aem.live` | `{site}--{org}` in `edsSites` | `production` |
| any host in `productionHosts` | exact hostname | `production` |
| anything else / empty URL | — | nothing loads |

## Authored configuration: the `/site-config` sheet (DA)

Martech settings are **edited by admins in DA**, not in code. Each site's DA repo has a sheet document
**`/site-config`** (e.g. `da.live/sheet#/aman-kumar24-dev/usta-foundation-site/site-config`), served as
`/site-config.json` after **Preview** (aem.page) / **Publish** (aem.live). `scripts/site-config.js`
`getSiteConfig()` applies it over the code defaults (the `SITES` entries, kept as a fallback). Changes go
live on publish — no code deploy. The request is started at the **very beginning of the eager phase**
(`loadEager` → `window.hlx.siteConfigFetch`, `priority: 'low'`, or `'high'` on Target pages) and shared
by Target (eager) and Analytics (delayed) — one request per page, issued before the LCP image.

**Tab `settings`** — columns `key | value | notes`:

| key | value | validation |
|---|---|---|
| `launch.production` | Tags embed for aem.live + production domain | `https://assets.adobedtm.com/….js` or empty |
| `launch.development` | Tags embed for aem.page + localhost | same |
| `consentRequired` | `true` / `false` | boolean |
| `onetrust.sdk` | OneTrust domain-script id, e.g. `43383d2d-67e6-4d4a-99cb-3ff760b82737` | UUID or empty |
| `onetrust.src` | `https://cdn.cookielaw.org/scripttemplates/otSDKStub.js` | that host, path ending in `otSDKStub.js`, or empty |
| `target.enabled` | `true` / `false` — only after Target is removed from Tags | boolean |
| `target.clientCode` | `unitedstatestennisas` | letters/digits/`-` |
| `target.serverDomain` | `unitedstatestennisas.tt.omtrdc.net` | `….tt.omtrdc.net` |
| `target.imsOrgId` | `A6D83F7A5347FCE90A490D44@AdobeOrg` | `…@AdobeOrg` |
| `target.a4t` | `false`, `true` / `server` (VisitorAPI, server-side), `client` (client-side, no VisitorAPI) | one of those |
| `target.flickerTimeout` | `1000` — max ms the first section waits for Target offers (0 = don't wait) | integer 0–3000 |

**Tab `donate-beacons`** — one row per donate.js event, columns `event | linkName | events | set | map`:

| event | linkName | events | set | map |
|---|---|---|---|---|
| checkoutOpen | Fundraise Up Donation Checkout Open | event9 | `pageName=ustafoundation:fundraiseup:DONATE` | `campaignId=prop61,eVar61; campaignName=prop62,eVar62` |
| donationComplete | Fundraise Up Donation Complete | event67 | | `amount=eVar76` |

`set`/`map` use `name=value; name=value`; variables must be `eVarN`, `propN`, `pageName`, `channel`
or `campaign`. If the tab exists it replaces the code default mapping; if absent, the default is used.

**Rules:** an unknown key, an invalid value or an invalid beacon row is **ignored with a console warning
`[site-config] …`** and the code default is used for it; a missing/unpublished sheet (404) means all
code defaults. Tags URLs are restricted to `assets.adobedtm.com` so a typo can never load another
host's script. Everything in the sheet is public (like the code) — never put secrets in it.

**Admin-only editing (in place since 2026-09-28):** DA org config (`da.live/config#/aman-kumar24-dev/`)
→ `permissions` has two rows for the sheet. The path must be **org-relative with the `.json` extension**,
because DA matches non-HTML files by exact path:

| path | groups | actions |
|---|---|---|
| `/usta-foundation-site/site-config.json` | aman.kumar@…, vishal.sharma@… | write |
| `/usta-foundation-site/site-config.json` | udit.upmanyu@…, victor.deb@…, ravishankar.ramamurthy@…, sri.priyesh.dash@…, naveen.kambam@… | read |

DA applies, per person/group, the **longest matching rule**. Anyone who can edit the site through
`/usta-foundation-site/**` but is *not* on one of these rows can still edit the sheet, so **when you add an
author to the site, also add them to the read row** (or an admin to the write row). Org `CONFIG` writers can
change these rules themselves.

**New repoless site:** create its own `/site-config` sheet in its DA repo (copy the layout above) and
preview/publish it — no code change needed. Add the same two permission rows for
`/<site>/site-config.json`. A `SITES` code entry is only needed for fallback defaults
or for its `productionHosts`/`edsSites` if you want defaults to apply.

## Adding site 2 / site 3 (repoless)

Fill in the placeholder entry in `scripts/site-config.js`:

```js
{
  id: 'site-2',
  productionHosts: ['www.example.org', 'example.org'],
  edsSites: ['example-site--example-org'], // {site}--{org} from the aem.page host
  launch: {
    production: 'https://assets.adobedtm.com/<company>/<property>/launch-<hash>.min.js',
    development: 'https://assets.adobedtm.com/<company>/<property>/launch-<hash>-development.min.js',
  },
  consentRequired: true, // false only if the site needs no consent gate
},
```

If `consentRequired: true`, Launch waits for OneTrust Performance (`C0002`) and
at.js waits for Targeting (`C0004`). Set `onetrust.sdk` and `onetrust.src` for
that site. `?consent=accept` grants both categories for testing only.

## ustafoundation — current (interim) setup

- Library: existing **"USTA Foundation"** property, production environment
  `launch-b4bd8f30c678.min.js`, used **unchanged** for now. It also contains
  Adobe Target v2 and a Hotjar rule. Plan: replace with an Analytics-only library
  (swap the URL in the config — no code change).
- No development/staging embed is published under the same name
  (`-development`/`-staging` 404) → preview + local also use the production
  library, so **preview traffic lands in `usta.global`**. Replace the `development`
  URL with the Development environment embed when available.
- `consentRequired: true`. OneTrust SDK `43383d2d-67e6-4d4a-99cb-3ff760b82737`
  (same property as www.usta.com). Performance `C0002` gates Launch; Targeting
  `C0004` gates at.js. The `/site-config` sheet overrides this — set
  `consentRequired` to `true` there and preview, or the sheet value wins.

### What the library sends

| Variable | Value |
|---|---|
| Report suite | production `usta.global`; dev/staging `usta.ustacomdev` |
| `pageName` | `foundation:` + `document.title` |
| `eVar17` / `prop17` | page URL |
| `campaign` (v0) | `?cid=` query parameter |
| page view | `s.t()` ("page load" rule) |
| FundraiseUp checkout open / donation complete | sent from site code — see "Donation events" above |
| Download links | automatic (doc, pdf, xls, … list in the extension) |

### Known gaps (interim library)

- Rules **"DIG-4755 links"** and **"iframe buttons"** use jQuery `$` and the old AEM
  class names → they fail (`$ is not defined`, visible only with
  `_satellite.setDebug(true)`); nav/button/text/social click tracking does not fire.
  Even on the old site these rules omit `events` from `linkTrackVars`, so event7/event9
  were never sent on clicks.
- `pageName` depends on `document.title`. Some pages have titles that differ from
  the live site (their Title metadata is missing, so the H1 is used):
  who-we-are, what-we-do, our-impact, special-funds. Fix the Title metadata in
  content to keep reporting continuous.
- Loaded ~3s after page load: very short visits are not counted; Target content can flicker.
- Performance: on throttled mobile the library costs ~3.5s of main-thread time
  (Target at.js is a large part) when Lighthouse captures it. See `MIGRATION.md`.

## Test checklist

1. Local: open `/en/home?cid=test`, wait ~5s.
   - `_satellite.property.name === 'USTA Foundation'`
   - One `b/ss/…` request: `pageName=foundation:Home`, `v17`/`c17` = URL, `v0=test`, `mid` present.
2. `_satellite.setDebug(true)` + reload → rule log shows "set global variables" before
   "page load" (Page Bottom rules still fire with async loading — no `_satellite.pageBottom()` needed).
3. Consent path: with `consentRequired: true`, no adobedtm/omtrdc/demdex requests
   until Performance / Targeting are accepted (or `?consent=accept`).
4. Unknown host (e.g. the machine's IP on port 3000) → nothing loads, no console errors.

---

## Adobe Target (at.js 2.x, outside Tags)

Pattern: [aem.live — Adobe Target at.js (legacy)](https://www.aem.live/developer/target-integration#adobe-target-atjs-legacy).
Target is moved **out of the Tags library** into site code; Tags keeps Analytics + ECID.

### Files

| File | Role |
|---|---|
| `scripts/site-config.js` → `target` | Per site: `enabled`, `clientCode`, `serverDomain`, `imsOrgId`, `a4t`. ustafoundation filled in, **`enabled: false` until cutover**; placeholders `{ enabled: false }` |
| `scripts/scripts.js` → `loadEager()` | Only when the page has `Target` metadata (any value except off/false/no): imports `target.js` and awaits it — i.e. until the **offers have arrived** (or `target.flickerTimeout`, default 1 s) — then renders the first section, so its first paint already shows the offer |
| `scripts/target.js` | Checks the site flag. When `consentRequired`, returns immediately and loads at.js only after Targeting consent, so the banner does not block first paint. Otherwise preconnects to the edge, modulepreloads at.js, creates the ECID instance (A4T), sets `targetGlobalSettings`, imports at.js, fires `getOffers` (pageLoad) on `at-library-loaded`, applies offers as sections/blocks decorate |
| `scripts/vendor/at.min.js` | at.js **2.11.4**, the aem.live-optimised build (loadable with `import()`). Tags used 2.11.7; a 2.11.7 download from Target → Administration → Implementation can replace it later **if it still works with `import()`** (the stock download may not; test it before swapping) |
| `scripts/vendor/VisitorAPI.min.js` | Experience Cloud ID service 5.5.0 (same version Tags uses), loaded as a classic script — **only in `target.a4t = true/server` mode** |
| `scripts/target-a4t.js` | **Client-side A4T** (`target.a4t = client`): exposes the at.js payload as `window.targetA4TPayload` + `target-a4t` event, and sends a single fallback link hit if the Tags page view went out without it |

### Settings (`window.targetGlobalSettings`)

aem.live defaults: `bodyHidingEnabled:false`, `pageLoadEnabled:false`, `viewsEnabled:false`,
`withWebGLRenderer:false`, `secureOnly:true`, `cookieDomain: location.hostname` (aem.page/aem.live are
public suffixes). Carried over from the Tags "Adobe Target v2" extension: `timeout:3000`,
`visitorApiTimeout:2000`, `globalMboxName:'target-global-mbox'`, `decisioningMethod:'server-side'`,
`analyticsLogging:'server_side'`, `supplementalDataIdParamTimeout:30`, `deviceIdLifetime`, `sessionIdLifetime`.

Difference from the aem.live snippet: its `getElementForOffer`/`getElementForMetric` are `async`, so the
"drop already-applied offers" filter always saw a (truthy) Promise and removed everything after the first
pass. `target.js` uses a synchronous `findTarget()` so offers whose elements decorate later still apply.

### A4T (Analytics for Target)

Mode per site via the sheet key `target.a4t`:

| value | at.js `analyticsLogging` | VisitorAPI | how the data reaches Analytics |
|---|---|---|---|
| `false` | (default) | no | not at all |
| `true` / `server` | `server_side` | yes, before at.js | Adobe stitches the at.js call and the Tags page view by `mid` + `sdid` |
| `client` | `client_side` | **no** | `target-a4t.js` → `window.targetA4TPayload` → Tags page view context data `a4t.payload` → Analytics processing rule |

**Client mode (`scripts/target-a4t.js`).** at.js returns `execute.pageLoad.analytics.payload.tnta` in
the page-load response; `captureA4T()` stores it as `window.targetA4TPayload` and fires `target-a4t`
(eager phase, before first paint — no extra request, no DOM work). The Tags page view (3 s delayed
phase) attaches it in the rule that sets global variables before the page view:

```js
if (window.targetA4TPayload) {
  s.contextData = s.contextData || {};
  s.contextData['a4t.payload'] = window.targetA4TPayload;
  window.targetA4TPayloadSent = true;
}
```

It is serialized as `c.&a4t.&payload=…&.a4t&.c`; an Analytics **processing rule** on the report suite
maps the context data variable `a4t.payload`. **Why context data:** AppMeasurement 2.27.0 drops a raw
`s.tnta` (unknown variable), `s.tnt` is the legacy Test&Target format, and `pe` is overwritten by `s.tl`
(all verified on intercepted beacons). **Check:** that the processing rule can write to the A4T/Target
dimension for the report suite — if it can't, the payload lands in a prop/eVar but the built-in A4T
reports stay empty. **Fallback:** if the first page view went out without the payload (late Target
response, or the Tags line missing), `target-a4t.js` sends **one** link hit `Target A4T` with the same
context data variable; de-duplicated by `window.targetA4TPayloadSent` / the page-view URL.

Measured (interleaved Lighthouse, localhost proxy): `client` costs nothing vs `false` (mobile LCP 5.71
vs 6.01 s, BP 96 both); `server` +~1 s mobile LCP (6.74 s) and BP 75 (ID-sync cookies). First paint in
the simulated-offer test: `client` ~1.1–1.4 s, `server` ~3.3 s.

**Server mode.** `target.js` calls `Visitor.getInstance(imsOrgId)` before at.js. The Tags ECID extension later reuses that
instance (one `Visitor` in `s_c_il`), so the at.js delivery call and the Analytics page view carry the
**same `mid` and `sdid`** — verified locally. Side effect: the ECID ID syncs (demdex, everesttech,
doubleclick, crwdcntrl — third-party cookies) now start early on Target pages instead of at ~3s; they are
the same syncs Tags already runs on every page. Changing that (e.g. `disableIdSyncs`) would affect
cross-domain visitor stitching — business decision, not changed.

### Authoring

Add **`Target` = `on`** to the page metadata (or to a folder in the bulk metadata sheet). Pages without it
load no Target code at all.

### Cutover (never run both at.js instances)

1. Tags property: delete rule **"Load Target"** and extension **Adobe Target v2**; build + publish to
   production (embed URL unchanged). Keep ECID + Adobe Analytics.
2. `site-config.js`: ustafoundation `target.enabled: true`; push.
3. Check on production: exactly one `…tt.omtrdc.net/rest/v1/delivery?…version=2.11.4` call per Target page,
   `window.adobe.target.VERSION === '2.11.4'`, and matching `sdid` on the delivery call and the `b/ss` page view.

Before step 1, if the flag is on, Tags' own at.js loads at ~3s and replaces `window.adobe.target` (seen in
testing) — hence the order.

### Activities (inventory needed)

VEC activities built on the old AEM markup target selectors that no longer exist. `toCssSelector` only
converts `:eq(n)`; structural changes need the activity re-pointed/rebuilt in VEC against the branch
preview. Old → new selector guide (homepage):

| Old site (AEM) | New site (EDS) |
|---|---|
| `a.navigation-menu__list-item-link--level-1/2` | `header .nav-sections a` |
| `button.top-navigation__main-button` (DONATE NOW) | `header a.nav-donate` |
| `a.top-navigation__logo-image` | `header a.nav-brand-link` |
| `.cmp-breadcrumb…` | `header .nav-breadcrumb` |
| hero `h1` / intro | `main .hero.banner` (`.hero h1`) |
| stats row | `main .columns.stats` |
| feature rows (text + video / images) | `main .columns.feature` |
| "Your support makes a difference" cards | `main .cards.support` (`li` per card) |
| `.cmp-button` | `main a.button` |
| footer social icons `.social-media-icons__item` | `footer .footer-social-icons a` |
| footer nav / legal | `footer .footer-nav a`, `footer .footer-legal a` |

### Performance (Lighthouse 12, localhost via test proxy, homepage, median of 3, Tags excluded)

| | no Target | Target on |
|---|---|---|
| Mobile perf / LCP | 82 / 4.2 s | 69 / 6.0 s |
| Desktop perf / LCP | 96 / 1.3 s | 94 / 1.5 s |
| Best Practices | 100 | 78–79 (ECID ID-sync cookies) |

Most of the mobile cost is parsing/executing at.js + VisitorAPI (~170 KB raw) before the first section
(the aem.live anti-flicker trade-off). Only enable `Target` metadata on pages with live activities.

**Anti-flicker: wait for offers (2026-09-28).** The first section now waits for the page-load offers
(capped by `target.flickerTimeout`), not just for at.js. Verified with a simulated offer on the hero `h1`:
the first visible frame already shows the offer. If Target answers after the cap, the page renders
without it and the offer applies on arrival (flicker only in that slow case); if it answers after at.js's
own `timeout` (3000 ms) the offer is dropped by at.js. Extra cost vs the at.js-only wait (localhost proxy,
median of 3): mobile LCP 6.0 → 6.6 s, desktop 1.5 → 1.9 s — about one Target round trip. Normal pages are
unaffected by the eager config fetch (LCP 2.53 → 2.45 s mobile, 0.78 → 0.78 s desktop).

### Target test checklist

1. `node migration-work/target/test-target.mjs --block-launch` — forces flag + metadata; expect one
   delivery call with `mid`, `sdid`, `logging: server_side`.
2. `node migration-work/target/test-target.mjs` (Tags on) — same `mid`/`sdid` on the Analytics page view,
   one Visitor instance.
3. `--fake-offer` — HTML offer with `<script>` applies and runs (Trusted Types OK); `:eq()` selector works.
4. `node migration-work/target/test-default.mjs` — no metadata / flag off → no vendor files, no delivery.
