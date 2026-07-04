# Plan 001: Gate GitHub Pages deploys on lint + tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat fa96076..HEAD -- .github/workflows/ docs/TECHNICAL_DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `fa96076`, 2026-07-03
- **Revision note**: this plan was originally written (at commit `ec0d5e2`)
  to align CI onto `master`, on the assumption that `master` was this repo's
  permanent primary branch. Commit `fa96076` ("Point to main") reversed that
  — it repointed `deploy.yml` from `master` to `main`, a real `main` branch
  now exists (`origin/HEAD` points at it), and the branch-mismatch note was
  removed from `docs/TECHNICAL_DESIGN.md`. This revision drops the
  branch-rename work (already done) and keeps only the still-real gap: the
  deploy workflow doesn't run lint/tests before building.

## Why this matters

`.github/workflows/ci.yml` and `.github/workflows/deploy.yml` now agree on
triggering off `main` (no more mismatch). But `deploy.yml` still runs only
`yarn build` (which includes `tsc -b` but not lint or tests) before
publishing to GitHub Pages, and it runs on every push to `main` — including
direct pushes, not just merged/reviewed ones. So broken code can still
deploy to production without lint or the test suite ever running against
it. `ci.yml` already runs lint/typecheck/test on the same push, but the two
workflows run independently — `deploy.yml` does not wait on `ci.yml`'s
result.

## Current state

- `.github/workflows/ci.yml` (unchanged, already correct — verify only):

  ```yaml
  name: CI

  on:
    push:
      branches: [main]
    pull_request:

  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: corepack enable
        - uses: actions/setup-node@v4
          with:
            node-version: 24
            cache: yarn
        - run: yarn install --immutable
        - run: yarn lint
        - run: yarn tsc -b
        - run: yarn test
  ```

- `.github/workflows/deploy.yml` — full file as it stands today:

  ```yaml
  name: Deploy

  on:
    push:
      branches: [main]

  permissions:
    contents: write

  concurrency:
    group: pages
    cancel-in-progress: true

  jobs:
    build-and-deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: corepack enable
        - uses: actions/setup-node@v4
          with:
            node-version: 24
            cache: yarn
        - run: yarn install --immutable
        - run: yarn build
        - uses: peaceiris/actions-gh-pages@v4
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: dist
  ```

- `docs/TECHNICAL_DESIGN.md`, "Stack" section's CI/CD bullet (current text,
  to be updated):

  ```
  - **CI/CD**: GitHub Actions
    - `ci.yml` — runs `yarn lint`, `yarn tsc -b`, `yarn test` on push to
      `main` and on every pull request.
    - `deploy.yml` — runs `yarn build` → deploys `dist/` to GitHub Pages on
      push to `main`.
  ```

  The old branch-mismatch note and the matching "Open Items" bullet are
  already gone — no action needed there.

## Commands you will need

| Purpose   | Command        | Expected on success |
|-----------|----------------|---------------------|
| Install   | `yarn install` | exit 0              |
| Typecheck | `yarn tsc -b`  | exit 0, no errors   |
| Tests     | `yarn test`    | all pass (10 at planning time) |
| Lint      | `yarn lint`    | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/deploy.yml`
- `docs/TECHNICAL_DESIGN.md` (the CI/CD bullet quoted above)

**Out of scope** (do NOT touch, even though they look related):
- `.github/workflows/ci.yml` — already correct (triggers on `main` +
  `pull_request`, already runs lint/typecheck/test). Verify only, do not
  edit.
- Branch renames of any kind — `main` is already the repo's primary/default
  branch (`origin/HEAD` points at it). No branch-naming work here.
- `vite.config.ts` / Pages custom-domain configuration — separate Open Item,
  not part of this plan.
- Node version, caching strategy, or the `peaceiris/actions-gh-pages` action
  version — no changes.
- Merging `ci.yml` and `deploy.yml` into one workflow, or making deploy
  `needs:` a CI job — out of scope for this plan (see Maintenance notes);
  just add the two `run` steps in place.

## Git workflow

- Branch: `advisor/001-fix-ci-triggers` (repo has no strict convention;
  recent branches are kebab-case like `move-to-base-ui`).
- Commit style: short imperative subject, e.g. `Gate Pages deploy on lint and tests`
  (matches history: "Fix centering", "Point to main").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Gate the deploy on lint and tests

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

### Step 2: Update the design doc

In `docs/TECHNICAL_DESIGN.md`, "Stack" section's CI/CD bullet, update the
`deploy.yml` description to say it runs `yarn lint` and `yarn test` before
`yarn build`, e.g.:

```
  - `deploy.yml` — runs `yarn lint`, `yarn test`, then `yarn build` →
    deploys `dist/` to GitHub Pages on push to `main`.
```

**Verify**: `grep -n "yarn lint.*yarn test.*yarn build\|yarn test.*yarn build" docs/TECHNICAL_DESIGN.md`
→ at least one match in the CI/CD bullet.

### Step 3: Confirm the workflow is valid YAML

```bash
npx --yes yaml-lint .github/workflows/deploy.yml
```

If `yaml-lint` is unavailable offline, fall back to a visual diff review —
the change is two lines.

**Verify**: exit 0 / no YAML errors reported.

## Test plan

No new unit tests — this changes CI configuration only. Full verification
requires a push to `main` and observing the Actions run; note that in your
report as a follow-up for the operator.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `deploy.yml` runs `yarn lint` and `yarn test` before `yarn build` (in
      that order)
- [ ] `.github/workflows/ci.yml` is byte-identical to the excerpt above
      (untouched)
- [ ] `docs/TECHNICAL_DESIGN.md`'s CI/CD bullet mentions `deploy.yml`
      running lint and test before build
- [ ] `yarn lint && yarn tsc -b && yarn test` all exit 0 (nothing else broke)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `deploy.yml` no longer matches the excerpt above (someone already changed
  it).
- `ci.yml`'s trigger is anything other than `branches: [main]` plus
  `pull_request` — that would mean the branch situation changed again since
  this revision.

## Maintenance notes

- `main` is now the only branch name hardcoded in these workflows. If it's
  ever renamed again, update both `ci.yml` and `deploy.yml` together.
- Deploys now take ~30s longer (lint + test). If that ever matters, convert
  to a single workflow where a deploy job `needs:` the test job instead —
  deliberately not done here to keep this plan's blast radius small.
