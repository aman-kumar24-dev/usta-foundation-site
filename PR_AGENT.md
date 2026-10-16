# PR Agent

Instructions for an AI agent (or a human following the same steps) that raises a pull request for this repo. The agent **asks the user for what it cannot know, works out the rest, shows a draft, and only then pushes and opens the PR.** `AGENTS.md` stays the source of truth: if anything here conflicts with it, `AGENTS.md` wins. The PR body follows `.github/pull_request_template.md`.

## Ground rules

- Never push or open the PR before the user has confirmed the draft (step 6).
- Never open a PR into `uat` or `main` unless the user asks (Leads own those; see `docs/BRANCHING.md`).
- Never commit to `develop`, `uat` or `main`, never force-push, and never touch `scripts/aem.js`, `head.html` or `package-lock.json`.
- Tick a checklist box only when that check really ran. Paste real command output; if a check cannot run (for example no `node_modules`), say so and leave the box unticked.
- Do not guess a URL, issue number or site. Ask.

## 1. Ask the user

Ask only what is missing, in one batch (use the question tool when available, otherwise plain text). Offer the default in brackets.

1. **Issue / ticket:** number for `Fix #`, and the ticket id for the branch name (for example `EDS5`). [none]
2. **Branch name:** `feature/<TicketAndName>`, one word after `feature/`, no hyphens or spaces (for example `feature/EDS5hotjarintegration`). Propose one from the ticket and the change. [propose]
3. **Target branch:** `develop`, `uat` or `main`. [`develop`]
4. **Kind of change:** docs-only, JS, CSS or UI, block or template, SVG or other assets, config. It decides which checks run (step 4). Infer it from the diff and confirm.
5. **Summary:** one or two lines on what changed and why. Draft it from the diff and let the user edit it.
6. **Demo page:** the path that shows the change, for example `/` or `/en/home`. Docs-only changes still need one, because the a11y workflow needs a valid URL. [`/`]
7. **Sites with content:** sites are named `<name>-dev` (dev content) and `<name>-com` (prod content) for `foundation` and `usta`. Only `foundation-dev` has content today. Ask only if this may have changed. [`foundation-dev` only]

## 2. Inspect the repo

```sh
git status -sb
git branch --show-current
git fetch origin
git rev-list --left-right --count origin/<target>...HEAD
git diff --stat origin/<target>...HEAD
```

- On `develop`, `uat` or `main`: create the feature branch from `develop` first (`git switch -c <branch>`).
- Behind the target: rebase on it (`git rebase origin/<target>`) and report conflicts to the user.
- Check the diff for untouchable files, secrets, and `docs/` files that are not covered by `.hlxignore`.
- Check the diff against AGENTS.md (Migration-Log and Project-Docs Rules): if `MIGRATION.md` or a `docs/` file the change affects is not updated, update it (or ask the user) before drafting the PR.

## 3. Work out the test URLs

AEM lowercases the branch in the hostname and `/` becomes `-`:

| Value | Rule | Example |
|---|---|---|
| `{branch}` | head branch, lowercased, `/` → `-` | `feature/EDS5hotjarintegration` → `feature-eds5hotjarintegration` |
| `{base-branch}` | target branch (already lowercase) | `develop` |

```
Before: https://{base-branch}--foundation-dev--usta-digital.aem.page/{path}
After:  https://{branch}--foundation-dev--usta-digital.aem.page/{path}
```

- Every other site (`foundation-com`, `usta-dev`, `usta-com`) has no content yet: write `n/a` on its two lines. When one gets content, give its Before and After URLs the same way (`https://{branch}--<site>--usta-digital.aem.page/{path}`).
- The `After:` line must be a bare URL on its own line, never `n/a`, with nothing after it. `.github/workflows/a11y.yml` reads the first `- After:` line, compares its branch with the PR branch (lowercased) and runs `npm run test:a11y` on it.
- After the push, Code Sync needs a minute. Check the After URL returns 200 (`curl -s -o /dev/null -w '%{http_code}' <url>`) and retry a few times before reporting a problem.

## 4. Run the checks that apply

| Change | Run |
|---|---|
| Any | `npm run lint` |
| CSS | `node tools/quality/breakpoint-check.mjs` |
| Layout or section width | `npm run check:overflow <after-url>` (dev server up) |
| Typography or global CSS | `npm run check:typography <after-url>` |
| SVG added or changed | `npm run check:svg` |
| UI or CSS | `npm run test:a11y <after-url>` |
| Docs-only | `npm run check:svg` only if an SVG changed; otherwise none |

Keep the output for the "Test output" section. Dependencies missing: run `npm install` after asking the user, or report that the check could not run.

## 5. Build the PR body

Start from `.github/pull_request_template.md` and:

- Fill in Summary (mention "docs-only" when true; name the `D-xxx`, PRD § and flow.md § you updated, or write "Project docs: none affected") and `Fix #<n>`; remove `Fix #` if there is no issue.
- Tick exactly one target branch.
- Remove the HTML guidance comment.
- Fill the `foundation-dev` Before and After lines (and any other site that has content); leave the rest as `n/a`.
- Tick the checklist boxes that were really verified and add a short reason after the ones that are n/a.
- Put real command output (or "docs-only") under "Test output".
- End with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Title: short, imperative, no ticket prefix needed.

## 6. Show the draft and get confirmation

Print the title, target branch, the full body and the commit list. Ask the user to confirm or edit. Do nothing outward-facing until they confirm.

## 7. Push and open the PR

```sh
git push -u origin <branch>
gh pr create --base <target> --head <branch> --title "<title>" --body-file <file>
```

Commit messages end with the attribution line from the session instructions. Then run `gh pr checks <number>` and report each check. If the a11y workflow fails on the branch check, compare the After URL with `{branch}` from step 3. If the After URL is not up yet, wait and re-run rather than editing the PR.

## 8. Report

Give the user the PR link, the target branch, the checks that ran, those that did not, and anything they still need to do (for example add the issue number).
