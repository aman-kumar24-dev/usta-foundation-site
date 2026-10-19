# Flows — `aem-coder-branch`

Step-by-step sequences for every runtime and operational flow on this branch. Architecture and
reasons: [Design.md](Design.md). Files, keys and commands: [implementation.md](implementation.md).
`develop`'s flows (new architecture) are in its `docs/flow.md`.

## Index

| # | Flow | Kind |
|---|---|---|
| F1 | Page load (all phases) | runtime |
| F2 | Settings resolution (`/site-config`) | runtime |
| F3 | Analytics: Tags load and page view | runtime |
| F4 | Target page: offers without flicker | runtime |
| F5 | A4T — client mode | runtime |
| F6 | A4T — server mode | runtime |
| F7 | Donation: link → widget → beacon | runtime |
| F8 | Consent and Hotjar | runtime |
| F9 | Failure and kill-switch paths | runtime |
| F10 | Admin changes a setting | operations |
| F11 | Enable Target on a page | operations |
| F12 | Production Target cutover | operations |
| F13 | DA content sync | operations |
| F14 | DA permission check | operations |
| F15 | Add a repoless site | operations |
| F16 | Code change → branch preview → PR | delivery |

## F1. Page load (all phases)

```
navigation ─► EDS HTML (head.html → scripts/aem.js, scripts/scripts.js)
│
├─ EAGER  loadEager()
│   1. read metadata `Target` → isTargetPage
│   2. window.hlx.siteConfigFetch = fetch('/site-config.json', { priority: isTargetPage ? 'high' : 'low' })
│   3. import('./site-config.js')                      (parses the same response, F2)
│   4. isTargetPage ? import('./target.js').initTarget()  (F4)  : skip
│   5. decorateMain(main)
│   6. await targetPromise   ← holds the first section only on Target pages (≤ flickerTimeout)
│   7. loadSection(first section)  → LCP
│
├─ LAZY   loadLazy()
│   8. import('./donate.js').initDonate()   (F7: link rewrite, interaction listeners)
│   9. header, footer, remaining sections, lazy styles; develop: openLinksInNewTab, section backgrounds
│
└─ DELAYED  setTimeout(loadDelayed, 3000)
    10. import('./consent-check.js')  (F8: consented.js → hotjar-router.js)
    11. import('./analytics.js')      (F3: Tags embed, donation beacons)
```

## F2. Settings resolution

```
site-config.js
  1. await window.hlx.siteConfigFetch (reuse; fetch itself only if missing)
  2. response not ok / not JSON → whenSiteConfigReady() rejects → F9 "sheet missing"
  3. settings tab rows → map key → value
  4. env = getEnvironment(location.hostname)            (rules: Design §3)
  5. getConfig(key):
        production : key.production ─► key ─► ''
        development: key.development ─► key.production ─► key ─► ''
  6. getMartechConfig():
        launch[env]        must match https://assets.adobedtm.com/…js
        consentRequired    boolean
        target.*           enabled bool · clientCode [\w-]+ · serverDomain *.tt.omtrdc.net ·
                           imsOrgId …@AdobeOrg · a4t client|server|true|false · flickerTimeout 0–3000
        donate-beacons     parsed rows (event, linkName, events, set, map)
     invalid value → console.warn('[site-config] invalid value for "<key>" — ignored') → key unused
     target.enabled but an account ID missing → Target off + warning
  7. result → { site, env }  (frozen; window.ustaSiteConfig for debugging)
```

## F3. Analytics: Tags load and page view

```
analytics.js (delayed, t ≈ 3 s after lazy)
  1. { site, env } = await getMartechConfig()
  2. src = site.launch[env]; none → stop (no Tags)
  3. register donation handlers (buffered window.donateEvents + live `donate` events)  → F7
  4. consentRequired ? onConsent(() => loadTags(src)) : loadTags(src)
  5. loadTags: skip if requested / _satellite / same <script>; else <script async src>
  6. Tags library runs → ECID (prod library) → rule "page view" → s.t()
       (dev property rule "Global Page View." also sets contextData['a4t.payload'] from F5)
  7. first visit without ECID cookie: /b/ss/… 302 → …&pccr=true   = ONE page view
  8. script load event → tags.loaded = true; tags.handlesDonate = !!window.FundraiseUp; flush queue
```

## F4. Target page: offers without flicker

```
loadEager ──► initTarget()
  1. { site } = await getMartechConfig()
  2. stop if !target.enabled, consentRequired, or window.adobe.target exists (Launch at.js)
  3. <link rel=preconnect https://<serverDomain>> + <link rel=modulepreload vendor/at.min.js>
  4. a4t mode = client | server | off
       server → load VisitorAPI.min.js, Visitor.getInstance(imsOrgId)        (F6)
  5. window.targetGlobalSettings = { clientCode, serverDomain, imsOrgId, timeout 3000, … }
  6. listen 'at-library-loaded' → getOffers({ execute: { pageLoad: {} } })
  7. await import(vendor/at.min.js)
  8. await Promise.race([offers settled, sleep(flickerTimeout)])   ← first section waits here
  9. return → loadSection(first) paints

  offers response ─► client mode: import target-a4t.js → captureA4T(response)   (F5)
                 └─► onDecoratedElement(applyOffers):
                       run now + on every section/block `loaded` (MutationObserver)
                       drop applied items (synchronous findTarget) → later sections get theirs

  Timeline outcomes
    offers < cap          → first paint already shows the offer
    cap < offers < 3000ms → page paints original, offer swaps in on arrival
    offers > 3000 ms      → at.js times out, offer dropped
    localhost             → delivery 400 (Target rejects http://localhost) → paints at once
```

## F5. A4T — client mode (`target.a4t = client`)

```
at.js delivery (analyticsLogging client_side)
  └─ response.execute.pageLoad.analytics.payload.tnta
       ▼
target-a4t.js captureA4T()
  1. window.targetA4TPayload = tnta; dispatch 'target-a4t'
  2. PerformanceObserver(resource, buffered) waits for the first page view (/b/ss/ without pe=)
       ▼ (delayed phase, F3)
Tags page-view rule (Set Variables custom code)
  3. s.contextData['a4t.payload'] = _satellite.getVar('Target A4T Payload')
     (should also set window.targetA4TPayloadSent = true — OI-6)
  4. beacon …c.&a4t.&payload=<tnta>&.a4t&.c…  → Analytics processing rule → A4T (OI-5)
       ▼
target-a4t.js check
  5. page view carried the payload, or targetA4TPayloadSent → done
  6. otherwise (rule missing / payload arrived late) → ONE tracker.tl(true,'o','Target A4T',
       { contextData: { 'a4t.payload': tnta }, linkTrackVars: 'contextData.a4t.payload' })
```

## F6. A4T — server mode (`target.a4t = true | server`)

```
target.js → VisitorAPI.min.js → Visitor.getInstance(imsOrgId)  (mid via demdex)
at.js delivery (analyticsLogging server_side) carries mid + supplementalDataId (sdid)
Tags (delayed) → ECID extension reuses the same Visitor instance → page view with the same sdid
Adobe stitches Target + Analytics server-side by sdid           (needs one Adobe org for both)
cost: ≈ +0.65–1 s mobile LCP, third-party ID-sync cookies
```

## F7. Donation: link → widget → beacon

```
lazy: initDonate()
  1. rewrite every donate link  https://www.ustafoundation.com/…?form=CODE  →  <current path>?form=CODE
  2. capture-phase click handler re-applies it (links added later)
  3. URL already has ?form= → loadFundraiseUp() now
     else listen once: pointerdown | keydown | touchstart | wheel | scroll → loadFundraiseUp()
     (donate-embed block calls loadFundraiseUp() eagerly)
  4. loadFundraiseUp(): Fundraise Up stub (account AURLRFGR) + Trusted Types hardening of its frames
  5. FundraiseUp.on('checkoutOpen' | 'donationComplete') → push window.donateEvents + dispatch `donate`
       ▼ (analytics.js, F3 step 3)
  6. tags.loaded && tags.handlesDonate → stop (old library's own Fundraise Up rules send it)
  7. build hit from the donate-beacons row: events, set (fixed vars), map (detail field → vars)
  8. queue; when the tracker exists (poll 500 ms × 40): tracker.tl(true,'o',linkName, overrides)
```

## F8. Consent and Hotjar

```
delayed: consent-check.js initFromSiteConfig()
  sheet unavailable          → consent workflow (placeholder CMP) → onConsentUpdate()
  consentRequired != 'true'  → loadConsented() → consented.js → hotjar-router.js
  consentRequired == 'true'  → onConsentUpdate(): consented? (?consent=accept)
                                 → dispatch consent.update { consented }
                                 → consented → loadConsented()
  onConsent(cb) (export) → cb now if granted, else on the first granting consent.update

hotjar-router.js
  1. await whenSiteConfigReady()  (missing sheet → return, no Hotjar)
  2. hotjarId / hotjarVersion / hotjarHostUrl via getConfig (env suffixes)
  3. inject Hotjar once (window._hjSettings + script)
```

## F9. Failure and kill-switch paths

| Situation | Result |
|---|---|
| `/site-config.json` 404 / invalid | no Tags, no Target, no Hotjar; one `[site-config] sheet unavailable` warning; page renders normally |
| `launch.<env>` blank / invalid | no Tags (warning if invalid); donation beacons not sent |
| `target.enabled=false` (or missing) | no at.js even with `Target` metadata |
| Target account ID missing/invalid | Target off + warning |
| Launch at.js already on the page | site at.js skipped (warning) |
| `consentRequired=true` | Tags after consent; site at.js skipped; Hotjar via consent workflow |
| Target delivery error / timeout | offers dropped, page renders after ≤ flickerTimeout |
| Fundraise Up script fails | donate links still navigate to `?form=` URL; no beacons |

## F10. Admin changes a setting

```
1. martech admin opens da.live/sheet#/aman-kumar24-dev/usta-foundation-site/site-config
   (others: read-only — org-config ACL, F14)
2. edit row (bare key, or .development / .production override)
3. Preview  → https://<branch>--usta-foundation-site--aman-kumar24-dev.aem.page/site-config.json
4. check a page on the branch preview (DevTools: one /site-config.json, expected embed/at.js;
   or node tools/martech-tests/site-config/test-branch.mjs)
5. Publish  → aem.live (production reads *.production or the bare key)
6. no deploy, no cache purge needed beyond EDS preview/publish
```

## F11. Enable Target on a page

```
1. prerequisite: the environment's Launch library has NO Target (cutover rule)
2. sheet: target.enabled=true + account rows (test account on preview today)
3. page metadata (or bulk metadata): Target = on
4. Preview the page → delivery call 200 on the branch preview (not on localhost)
5. Target admin builds the activity with EDS selectors (Design §7 table)
```

## F12. Production Target cutover

```
1. Launch admin: remove Adobe Target extension, "Load Target" rule, Hotjar rule from
   "USTA Foundation" → build Analytics-only library → publish (same embed URL)      (OI-3)
2. sheet: target.clientCode.production = unitedstatestennisas
          target.serverDomain.production = unitedstatestennisas.tt.omtrdc.net
          target.imsOrgId.production = A6D83F7A5347FCE90A490D44@AdobeOrg
          target.a4t.production = client | true (decide; client needs processing rule)    (OI-9)
3. Publish the sheet
4. verify on production Target pages: ONE delivery call (client unitedstatestennisas),
   one page view, A4T data path (F5/F6), Hotjar once
5. rollback: target.enabled.production=false (or blank account rows) + Publish
```

## F13. DA content sync (`aemdemos/foundation-usta → aman-kumar24-dev/usta-foundation-site`)

```
user asks (AEM Coder) or runs: npm run da:sync [-- --dry-run | --folders=/en/home/news,/.da/library]
  1. auth: injected in AEM Coder; elsewhere DA_TOKEN (read source, write destination)
  2. list source recursively + /.da/library (hidden from listings)
  3. --dry-run → print the file list, stop
  4. backup destination copies → migration-work/da-sync/backups/<timestamp>/
  5. for each file (6 in parallel): GET source → (Library .json: /<source>/ → /<destination>/)
     → POST destination (multipart `data`)            mirror only — nothing is deleted
  6. bulk preview copied pages (not dot-folders) via admin.hlx.page
  7. report copied / failed
  verify: tools/martech-tests/da-sync/verify.mjs, verify-library.mjs
```

## F14. DA permission check (org config)

```
request by identity I for path P (action read|write)
  1. collect I's identities: email, <IMS org>, <IMS org>/<group>
  2. for each identity: rows whose path matches P (+** folder rules, exact page path w/o .html,
     non-HTML with extension, CONFIG keywords) → the LONGEST matching path wins
  3. across identities: the most permissive action wins
  4. folders: listable if I has rights on a descendant; only entries on the way are shown
  5. a config without a CONFIG write row is refused (lock-out guard)
  6. group changes apply after the user logs out and in
```

## F15. Add a repoless site

```
1. create the site's DA repo + EDS site (same GitHub code)
2. author /site-config (settings + donate-beacons) with that site's Tags URLs, consentRequired, …
3. org-config permission rows for /<site>/site-config.json (admins write, authors read)
4. Preview/Publish → no code change
```

## F16. Code change → branch preview → PR

```
1. work on aem-coder-branch; local: aem up (see implementation §4)
2. quality gate (AGENTS.md) + tools/martech-tests for martech changes
3. MIGRATION.md entry + .ema updates (README protocol)
4. git pull → commit → push origin aem-coder-branch   (AEM Code Sync → branch preview)
5. PR with the branch preview link  — blocked on OI-19 (develop's new architecture)
```
