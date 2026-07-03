# Plan 001: Make CI run on every push and gate deploys on lint + tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- .github/workflows/ docs/TECHNICAL_DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

The CI workflow (`.github/workflows/ci.yml`) triggers on pushes to a branch
named `main`, but this repository's default and primary branch is `master`
— `main` does not exist. So lint/typecheck/tests **never run on any push**;
they only run on pull requests, and this repo's history shows direct pushes
to `master` are the normal workflow. Meanwhile the deploy workflow publishes
to GitHub Pages on every push to `master` running only `yarn build` (which
includes `tsc -b` but not lint or tests). Net effect: broken code can deploy
to production without any check ever failing. This was already flagged in
`docs/TECHNICAL_DESIGN.md`'s "Open Items"; the maintainer has chosen to
align everything to `master`.

## Current state

- `.github/workflows/ci.yml` — lint/typecheck/test job. Trigger block (lines 1–6):

  ```yaml
  name: CI

  on:
    push:
      branches: [main]
    pull_request:
  ```

- `.github/workflows/deploy.yml` — Pages deploy. Relevant steps (the job's tail):

  ```yaml
      - run: yarn install --immutable
      - run: yarn build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist
  ```

- `docs/TECHNICAL_DESIGN.md` documents the mismatch in two places that must
  be updated once fixed:
  - The "Stack" section, CI/CD bullet: "Note: `ci.yml` watches `main` while
    `deploy.yml` watches `master`, and `master` is this repo's actual
    default/primary branch — see 'Open Items.'"
  - The "Open Items" list: "`ci.yml` triggers on push to `main`; `deploy.yml`
    triggers on push to `master`, which is this repo's actual primary branch.
    Confirm this is intentional (e.g. a `main` branch is planned) or align
    the two."

## Commands you will need

| Purpose   | Command        | Expected on success |
|-----------|----------------|---------------------|
| Install   | `yarn install` | exit 0              |
| Typecheck | `yarn tsc -b`  | exit 0, no errors   |
| Tests     | `yarn test`    | all pass (10 at planning time) |
| Lint      | `yarn lint`    | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docs/TECHNICAL_DESIGN.md` (the two passages quoted above)

**Out of scope** (do NOT touch, even though they look related):
- Renaming the `master` branch to `main` — the decision is to align CI to
  `master`, not to rename the branch.
- `vite.config.ts` / Pages custom-domain configuration — separate Open Item,
  not part of this plan.
- Node version, caching strategy, or the `peaceiris/actions-gh-pages` action
  version — no changes.

## Git workflow

- Branch: `advisor/001-fix-ci-triggers` (repo has no strict convention;
  recent branches are kebab-case like `move-to-base-ui`).
- Commit style: short imperative subject, e.g. `Fix CI branch trigger and gate deploys`
  (matches history: "Fix centering", "Update documentation").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Point ci.yml at master

In `.github/workflows/ci.yml`, change the push trigger from
`branches: [main]` to `branches: [master]`. Keep the `pull_request` trigger
unchanged.

**Verify**: `grep -n "branches: \[master\]" .github/workflows/ci.yml` → one match (line ~5).
`grep -n "main" .github/workflows/ci.yml` → no matches.

### Step 2: Gate the deploy on lint and tests

In `.github/workflows/deploy.yml`, add two steps immediately after
`- run: yarn install --immutable` and before `- run: yarn build`:

```yaml
      - run: yarn lint
      - run: yarn test
```

(`yarn build` already runs `tsc -b`, so no separate typecheck step is
needed.) Match the existing two-space-per-level indentation exactly.

**Verify**: `grep -n "yarn lint\|yarn test\|yarn build" .github/workflows/deploy.yml`
→ three matches, in the order lint, test, build.

### Step 3: Update the design doc

In `docs/TECHNICAL_DESIGN.md`:

1. In the "Stack" section's CI/CD bullet, update the `ci.yml` description to
   say it runs on push to `master` and on every pull request, and replace the
   "Note: `ci.yml` watches `main` …" sentence with a note that `deploy.yml`
   also runs `yarn lint` and `yarn test` before building.
2. In "Open Items", delete the bullet about the `main`/`master` trigger
   mismatch (it is now resolved).

**Verify**: `grep -n "watches \`main\`" docs/TECHNICAL_DESIGN.md` → no matches.
`grep -c "main" .github/workflows/ci.yml` → 0.

### Step 4: Confirm the workflows are valid YAML

```bash
node -e "console.log(require('fs').readFileSync('.github/workflows/ci.yml','utf8').length)" \
  && npx --yes yaml-lint .github/workflows/ci.yml .github/workflows/deploy.yml
```

If `yaml-lint` is unavailable offline, fall back to a visual diff review —
the changes are three lines total.

**Verify**: exit 0 / no YAML errors reported.

## Test plan

No new unit tests — this changes CI configuration only. Full verification of
the trigger fix requires a push to `master` and observing the Actions run;
note that in your report as a follow-up for the operator.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "branches: \[master\]" .github/workflows/ci.yml` → 1 match
- [ ] `grep -n "main" .github/workflows/ci.yml` → 0 matches
- [ ] `deploy.yml` runs `yarn lint` and `yarn test` before `yarn build`
- [ ] `grep -n "watches \`main\`" docs/TECHNICAL_DESIGN.md` → 0 matches
- [ ] `yarn lint && yarn tsc -b && yarn test` all exit 0 (nothing else broke)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The workflow files no longer match the excerpts above (someone already
  fixed or restructured them).
- A `main` branch now exists in the repo (`git branch -a` shows it) — the
  "align to master" decision may be stale.

## Maintenance notes

- If the default branch is ever renamed to `main`, both workflow triggers
  must change together — they are now the only two places that hardcode the
  branch name.
- Deploys now take ~30s longer (lint + test). If that ever matters, convert
  to a single workflow where a deploy job `needs:` the test job instead.
