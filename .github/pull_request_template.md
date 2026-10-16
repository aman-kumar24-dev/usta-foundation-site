## Summary

<!-- What changed and why, in a few lines. Say if it is docs-only. -->

Fix #

## Target branch

- [ ] `develop`
- [ ] `uat` (Leads)
- [ ] `main` (Leads)

## Test URLs

<!--
Branch in the URL = your branch lowercased with / replaced by - (feature/EDS5hotjarintegration becomes
feature-eds5hotjarintegration). {base-branch} is the branch this PR targets (develop, uat or main).
Use a page that shows the change. Docs-only changes still need a valid After URL (e.g. the home page).
Keep the After line a bare URL, never n/a: the a11y workflow reads the first "After" line.
Sites are <name>-dev (dev content) and <name>-com (prod content) for foundation and usta. Content exists only in foundation-dev for now; give a URL for any other site once it has content.
-->

### foundation-dev (dev content)

- Before: https://{base-branch}--foundation-dev--usta-digital.aem.page/{path}
- After: https://{branch}--foundation-dev--usta-digital.aem.page/{path}

### Other sites (n/a until the site has content)

- foundation-com Before: n/a
- foundation-com After: n/a
- usta-dev Before: n/a
- usta-dev After: n/a
- usta-com Before: n/a
- usta-com After: n/a

## Checklist

- [ ] Branch is `feature/<TicketAndName>` (one word, e.g. `feature/EDS5hotjarintegration`), cut from and rebased on `develop`
- [ ] Checked on `foundation-dev`, before and after
- [ ] `npm run lint` passes
- [ ] CSS / UI change: `breakpoint-check`, `check:overflow`, `check:typography` and `test:a11y` pass
- [ ] SVG added or changed: `npm run check:svg` passes
- [ ] No changes to `scripts/aem.js`, `head.html` or `package-lock.json`
- [ ] No secrets; no hard-coded user-facing strings; images have `alt`
- [ ] `MIGRATION.md` logged (block, template, section or script change, or a non-obvious fix); affected `docs/` files (PRD, decision, flow, architecture) updated, or the Summary says "Project docs: none affected"

## Test output

<!-- Paste command output for the checks above, or write "docs-only". -->
