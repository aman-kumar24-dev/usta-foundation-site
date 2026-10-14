# OneTrust `OtAutoBlock.js`

How the OneTrust auto-block script works on usta.com, what it blocks, and whether the EDS site needs it.

Findings come from reading the live script and the usta.com / ustacoaching.com pages (tested from India, cookies cleared, no banner choice). Items marked **Not verified** were not tested.

## 1. What it is

`OtAutoBlock.js` is OneTrust's automatic script blocker. It is loaded from the tenant's consent folder:

```html
<script type="text/javascript"
  src="https://cdn.cookielaw.org/consent/43383d2d-67e6-4d4a-99cb-3ff760b82737/OtAutoBlock.js"></script>
```

The ID in the path (`43383d2d-…`) is usta.com's OneTrust domain ID, the same one as `data-domain-script` on the SDK stub. ustacoaching.com uses a different ID (`01981933-7e03-701d-9fbe-c1ab250a36cb`).

It belongs to Strictly Necessary (`C0001`) only because it is part of the consent mechanism. It does not gate anything by itself.

## 2. What the script contains

The script is about 436 KB, minified, and is generated per tenant:

- **A blocklist.** About 73 third-party hosts, each mapped to a OneTrust category (`C0002`, `C0003`, `C0004`, `C0005`). Examples: `connect.facebook.net`, `securepubads.g.doubleclick.net`, `static.zdassets.com`, `script.hotjar.com`, `assets.adobedtm.com`, `dpm.demdex.net`, `s7.addthis.com`, `www.google-analytics.com`.
- **Matching logic.** Each entry matches by exact URL, by a custom pattern, or by a system regex.
- **DOM hooks.** It uses a `MutationObserver` and wraps `document.createElement`, so it sees scripts and iframes as they are created, not only those in the initial HTML.
- **An opt-out attribute.** `data-ot-ignore` on a tag tells it to leave that tag alone.

The blocklist is configured in the OneTrust admin console, so the exact hosts and categories can change without a code deploy.

## 3. How blocking works

1. The page loads `OtAutoBlock.js` first.
2. When a script or iframe is added, the script checks its URL against the blocklist.
3. For a match, it rewrites the tag to `type="text/plain"` and adds the matching `optanon-category-C000X` class. The browser does not run a `text/plain` script.
4. When the visitor consents to that category, OneTrust swaps the tag back to `text/javascript`, and the browser loads it.

This is the same mechanism as manual blocking (the `type="text/plain"` plus `optanon-category-…` pattern). Auto-block just applies it for you.

OneTrust's rule for multiple categories: a class like `optanon-category-C0002-C0004-C0005` means the script runs only when **all** listed categories are active. See OneTrust's manual blocking article:
https://my.onetrust.com/articles/en_US/Knowledge/UUID-518074a1-a6da-81c3-be52-bae7685d9c94

## 4. Why it must load first

It can only block tags that are created after it starts. A tag that is already running, or already in the HTML above it, is not blocked. OneTrust's setup puts it before every other script, followed by `otSDKStub.js` and the `OptanonWrapper()` callback:

```html
<script src=".../consent/<domain-id>/OtAutoBlock.js"></script>
<script src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js"
        data-document-language="true"
        data-domain-script="<domain-id>"></script>
<script>function OptanonWrapper() { /* site code */ }</script>
```

## 5. What it does and does not cover

| Case | Covered? |
|---|---|
| Tag written in the HTML, on the blocklist | Yes |
| Tag added later by script, on the blocklist | Yes (DOM hooks) |
| Hand-marked tags (`type="text/plain"` + class) | Handled by OneTrust's manual blocking, no auto-block needed |
| A host not on the blocklist | No, it runs unless gated by hand |
| Tags a tag manager creates later | **Not verified** for usta.com. OneTrust's docs say tag-manager-injected tags can bypass blocking. |
| Tags with `data-ot-ignore` | Skipped on purpose |

On usta.com, the Launch tag, GPT, Zendesk and Meta carry the `optanon-category-…` class in the served HTML. I did not work out whether each class was added by auto-block or written by hand.

## 6. What I saw on the sites

- **usta.com (opt-in region):** with only `C0001` active, Launch did not run (`_satellite` was undefined) and no marketing requests were made.
- **usta.com (US):** the US rule is opt-out and all categories start active, so gated tags run on load. **Not verified** from a US location. The category defaults come from the OneTrust config.
- **ustacoaching.com:** it also loads `OtAutoBlock.js`, but with only `C0001` active, Launch, Hotjar and others still ran. Only Meta's Pixel was held back. Launch has no class on its tag and its host may not be on that tenant's blocklist. I did not read ustacoaching.com's blocklist or its Launch rules.

## 7. Does the EDS site need it?

**Probably not**, for these reasons:

- Third-party code in EDS is loaded by `scripts.js` / `delayed.js`, so consent can be checked in your own code before each load.
- It must be the first script on the page. In EDS that is `head.html`, which the project rules say must not be modified. If it is injected later from `scripts.js`, it cannot reliably block what already ran.

**Recommended instead:**
1. Load `otSDKStub.js` with the domain ID and define `OptanonWrapper`.
2. In `scripts.js`, load Launch only after checking `window.OnetrustActiveGroups` for the required categories.
3. Re-run that check from `OptanonWrapper` so Launch loads when consent is given.

**Add `OtAutoBlock.js`** only if authors paste third-party embeds (YouTube, Vimeo, social widgets, forms) into content that could load before your code runs. Test how it behaves when injected late before relying on it.

## 8. Official OneTrust documentation

Summarised from search-result excerpts of OneTrust's knowledge base. I did not read the full articles, and some are several years old, so confirm the details in your own OneTrust tenant.

- [OneTrust Cookie Auto-Blocking](https://my.onetrust.com/articles/en_US/Knowledge/UUID-cdb2fcad-1640-fdbd-e432-73c5536f0bbd): how it works and its requirements.
- [Preventing Auto-Blocking from Blocking Scripts](https://my.onetrust.com/articles/en_US/Knowledge/UUID-71e7d0a8-03d8-e272-e683-72cadded2ecf): the `data-ot-ignore` attribute.
- [Publishing and Implementing Cookie Consent Scripts](https://my.onetrust.com/s/article/UUID-7478d3b4-18eb-3ac0-a6fd-fb7ebff9f8dc?language=en_US): enabling "Enable Automatic Blocking of Cookies" when publishing.
- [Implementation Best Practices: Cookie Consent](https://my.onetrust.com/s/article/UUID-648cbd31-0007-76ab-ca6c-85023ebf83dc?language=en_US)
- [Manual script blocking](https://my.onetrust.com/articles/en_US/Knowledge/UUID-518074a1-a6da-81c3-be52-bae7685d9c94): the `type="text/plain"` + `optanon-category-…` pattern.

What the official excerpts say:
- The script must run **synchronously**, and must be first in `<head>`.
- It must be added **directly to the page, not via an injector or tag manager**, or tags can fire before it finishes.
- Cookies that are uncategorized, have no source URL, or are set inline with `document.cookie`, are not controlled. Strictly Necessary cookies are excluded.
- iframes embedded directly in the page (for example some YouTube videos) should be blocked manually.
- OneTrust recommends tag manager integration or manual blocking for sites with many cookies or ad revenue.

The excerpts say source URL matching is exact, not by pattern. The script on usta.com does contain pattern-based matching (`CUSTOM_PATTERN` and `SYSTEM_PATTERN`), so the docs may be out of date or describe an older mode.

## 9. Open questions

- Is the Launch tag's class on usta.com added by auto-block or written by hand?
- What is on the ustacoaching.com blocklist, and why is Launch missing from it?
- Do tags inserted by Launch rules get blocked by auto-block, or only by consent checks inside the container?
- What do US visitors actually see? A run from a US location is needed.
