# Branching strategy and environments

Code moves in one direction, through four long-lived branches. Each branch maps to one
environment, so the branch a change is on tells you where it can be tested.

![Branching strategy: feature branches into develop, uat and main, each mapped to an environment](assets/branching-strategy.svg)

## Branches and environments

| Branch | Role | Environment | Pull request into it |
|---|---|---|---|
| `feature/*` | Your work, branched off `develop` | Local dev machine | n/a: branch off `develop` |
| `develop` | Integration | QE env (QA testing) | Opened by the developer from `feature/*` |
| `uat` | Pre-release | UAT env (business testing) | Leads, from `develop` |
| `main` | Default branch | Production (go-live) | Leads, from `uat` |

The name under each arrow in the diagram is the owner of that pull request: Leads promote
`develop` to `uat`, and `uat` to `main`, which is the go-live step.

## Ground rules

1. **No direct commits to `develop`, `uat` or `main`.** Changes arrive through pull requests only.
2. **Rebase your feature branch on `develop`** before raising a pull request.
3. **Code only moves forward:** `develop` → `uat` → `main`. Never merge `uat` or `main` into a
   feature branch directly.

## Working on a change

1. Branch off `develop`: `git switch develop && git pull && git switch -c feature/<TicketAndName>`.
   After `feature/` the name is one word with no hyphens or spaces: the ticket id followed by a
   short name, for example `feature/EDS5hotjarintegration` or `feature/EDS125googlePlaceLibrary`.
2. Develop locally with `aem up` (see the [README](../README.md#local-development)).
3. Run the [quality checks](../README.md#quality-checks) before opening the pull request.
4. Rebase on `develop`, push, and open a pull request into `develop`.
5. Put a link in the pull request description to a page that shows the change, on the feature
   branch preview (branch lowercased, `/` replaced by `-`): `https://{branch}--foundation-dev--usta-digital.aem.page/{path}`. Pull requests
   without it are rejected (`AGENTS.md`).
6. After QE sign-off on `develop`, a Lead opens the pull request `develop` → `uat`. After
   business sign-off in UAT, a Lead opens the pull request `uat` → `main`.

## Dev and production strategy

- **Dev (local and `develop`):** feature work runs on a developer machine against the AEM dev
  server, and merged work is integrated on `develop` and tested by QE. Nothing here is customer
  facing.
- **Pre-release (`uat`):** the release candidate. The business verifies it before it is promoted.
- **Production (`main`):** the only branch that goes live. It changes only through a
  Lead-owned pull request from `uat`, so everything in production has already passed QE and UAT.
- **Code and content are separate.** The branches above govern code. Content is authored in DA and
  published from there, and each site (and environment) has its own martech config sheet, so
  vendors and consent settings are changed in the sheet, not in code. See [Martech](MARTECH.md).

## Related

- [README](../README.md) — setup, architecture and quality checks
- [Martech](MARTECH.md) — config sheet, consent and vendor loading
- [AGENTS.md](../AGENTS.md) — project rules and the pull request requirements
