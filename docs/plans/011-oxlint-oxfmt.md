# 011 — Replace ESLint with oxlint, add oxfmt

Swap the ESLint stack for [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
and introduce [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) as the
project's first real formatter. Both are Rust-based Oxc tools: oxlint claims
50–100× ESLint, oxfmt ~30× Prettier.

Versions at time of writing: `oxlint@1.80.0`, `oxfmt@0.65.0`.

## Current state

- **Lint**: `eslint.config.js` (flat config), `yarn lint` = `eslint .`,
  currently passing clean. Six dev dependencies exist solely for it:
  `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `globals`.
- **Format**: none. No Prettier, no `.editorconfig`, no `.vscode/settings.json`
  (`.vscode/` is gitignored). Style is conventional but unenforced:
  no semicolons, single quotes in TS, double quotes in JSX attributes,
  2-space indent, trailing commas in multiline literals, ~100 col.
- **Scope**: 58 files under `src/`, plus `vite.config.ts` and root JSON.
  ESLint currently lints only `**/*.{ts,tsx}` and ignores `dist`, `old`.
- **CI**: `ci.yml` runs `yarn lint` → `yarn tsc -b` → `yarn test`;
  `deploy.yml` runs `yarn lint` → `yarn test` → `yarn build`.

## Why this is worth doing here

Speed is the smallest reason — this repo is 58 files and ESLint is not slow
at that size. The two real payoffs:

1. **It unblocks the TypeScript 7 upgrade.** `docs/TECHNICAL_DESIGN.md`'s
   "Open Items" pins `typescript` at `~6.0.2` because `typescript-eslint`
   hard-throws on any TS `>= 7`. Deleting `typescript-eslint` deletes that
   constraint. (Upgrading TS itself is a *follow-up*, not part of this plan —
   but the open item's blocker disappears and the doc must be updated to say
   so.)
2. **A formatter finally exists.** Today nothing enforces the style above;
   it survives on habit. oxfmt makes it mechanical, and brings import
   sorting and Tailwind class sorting built in rather than as Prettier
   plugins — the latter is directly relevant to a repo with 800+ character
   `className` strings in `src/components/ui/`.

## Rule parity — what actually maps

oxlint enables only the **correctness** category by default (114 of ~870
rules). ESLint's `recommended` sets are broader, so parity has to be
configured, not assumed.

| Today (ESLint) | oxlint equivalent | Notes |
|---|---|---|
| `js.configs.recommended` | `eslint` core rules; `categories.correctness` + `suspicious` | Not a 1:1 set. `correctness` alone is narrower than ESLint recommended; adding `suspicious: "warn"` gets closer. |
| `tseslint.configs.recommended` | `plugins: ["typescript"]` | Non-type-checked, same as today. Type-aware linting exists (`options.typeAware`, needs `oxlint-tsgolint`) but today's config isn't type-checked either — out of scope. |
| `reactHooks.configs.flat.recommended` | `plugins: ["react", "react-hooks"]`, `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps` | **Fidelity gap.** `eslint-plugin-react-hooks` v7's flat/recommended also ships the React Compiler rules (`set-state-in-effect`, `refs`, `immutability`, etc.). oxlint does not have those. Accept the loss, or keep ESLint alongside for that plugin only (not recommended — see "Rejected"). |
| `reactRefresh.configs.vite` | `react/only-export-components` | Lives in the **restriction** category, so it must be turned on by name. |
| `globalIgnores(['dist','old'])` | `ignorePatterns` | oxlint also honours `.gitignore`, which already covers `dist`. `old/` doesn't exist in the tree any more — drop it. |
| `src/components/ui/**` → `only-export-components: off` | `overrides` entry, same glob | Direct translation. |

`@oxlint/migrate` can generate a first-pass `.oxlintrc.json` from
`eslint.config.js`; treat its output as a starting point to hand-check
against the table above, not as the answer.

## Phase 1 — oxlint replaces ESLint

1. `yarn add -D oxlint` and remove `eslint`, `@eslint/js`,
   `typescript-eslint`, `eslint-plugin-react-hooks`,
   `eslint-plugin-react-refresh`, `globals`. Delete `eslint.config.js`.
   (`globals` has no other consumer — confirm before removing.)
2. Write `.oxlintrc.json`:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "react-hooks", "oxc"],
  "categories": { "correctness": "error", "suspicious": "warn" },
  "rules": {
    "react-hooks/exhaustive-deps": "error",
    "react/only-export-components": "error"
  },
  "ignorePatterns": ["dist"],
  "overrides": [
    {
      "files": ["src/components/ui/**/*.tsx"],
      "rules": { "react/only-export-components": "off" }
    }
  ]
}
```

3. Scripts: `"lint": "oxlint"`, add `"lint:fix": "oxlint --fix"`.
4. Run it. **Expect new findings** — `suspicious`, `unicorn`, and `oxc`
   rules have never run against this code. Triage each one individually
   (fix vs. disable in config); do not blanket-disable a category to get to
   green, and do not let `--fix` rewrite the codebase unreviewed.
5. Re-run `yarn tsc -b` and `yarn test` to confirm nothing regressed.

**Checkpoint before Phase 2.** Phase 1 is independently shippable.

## Phase 2 — oxfmt

Formatting churn is the risk here, so measure before committing to a config.

1. `yarn add -D oxfmt`, then `yarn oxfmt --init` to drop a `.oxfmtrc.json`.
2. Set the two options that keep the existing style (everything else's
   default already matches: `printWidth: 100`, `tabWidth: 2`,
   `trailingComma: "all"`, `jsxSingleQuote: false`, `arrowParens: "always"`):

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "semi": false,
  "singleQuote": true
}
```

   Leaving oxfmt on its Prettier defaults instead (`semi: true`,
   `singleQuote: false`) would rewrite every line of the codebase. See
   "Decisions to confirm."
3. **Measure**: `yarn oxfmt --list-different` and `--check` over `src/`.
   This number decides whether the reformat lands as one commit or is
   worth tuning further. Long `className` strings can't wrap, so the 74
   lines currently over 100 columns mostly stay as they are.
4. **Scope it deliberately.** oxfmt also formats JSON, YAML, CSS, and
   Markdown, and `docs/**` and `.github/**` are explicitly out (decision 6).
   Target `src`, `vite.config.ts`, and the root JSON configs. Prefer
   `ignorePatterns` in `.oxfmtrc.json` over path arguments in the scripts,
   so an editor-integration or `--lsp` run obeys the same scope as CI;
   oxfmt also auto-detects `.gitignore`.
5. Scripts: `"format": "oxfmt"`, `"format:check": "oxfmt --check"`.
6. Land the mechanical reformat as **its own commit**, separate from the
   config commit, so `git blame` has one obvious node to skip. Consider a
   `.git-blame-ignore-revs` entry.
7. Sorting features are **opt-in and deferred** — `sortImports` and
   `sortTailwindcss` each produce a second large diff. See "Decisions to
   confirm."

## Phase 3 — CI and docs

1. `ci.yml`: add `yarn format:check` alongside `yarn lint`.
   `deploy.yml` runs only after CI has passed on `main`; adding the check
   there too is optional and only defends against a direct push.
2. `AGENTS.md` "Commands": replace the ESLint line, add `yarn format` /
   `yarn format:check`, and update the "Run typecheck, lint, and tests
   before considering any change done" line to include formatting.
3. `docs/TECHNICAL_DESIGN.md`:
   - "Stack" — replace ESLint with oxlint + oxfmt, note `.oxlintrc.json`
     and `.oxfmtrc.json` as the config files.
   - "CI/CD" — reflect the added `format:check` step.
   - "Open Items" — rewrite the `typescript` pin item: `typescript-eslint`
     is gone, so the TS 7 blocker is gone; what remains is doing the
     upgrade and re-verifying Vite/Vitest/`tsc -b` under TS 7.
4. Delete this plan file in the commit that lands the work (repo
   convention).

## Decisions already made

| # | Decision | Resolution |
|---|---|---|
| 1 | oxfmt style: keep the repo's no-semicolon / single-quote style, or adopt oxfmt's Prettier defaults? | **Keep the existing style for now** — a two-line config, and the reformat diff stays whitespace/wrapping instead of every line. Moving to oxfmt's defaults is deferred to plan `012`. |
| 2 | Enable `sortImports`? | **No** — deferred to plan `013`. It's a second whole-repo diff and deserves its own commit. |
| 3 | Enable `sortTailwindcss`? | **No** — deferred to plan `014`. Same reasoning. |
| 4 | Rule breadth | **`correctness: "error"` + `suspicious: "warn"`**, plus `react-hooks/exhaustive-deps` and `react/only-export-components` by name. No `unicorn`/`pedantic`. |
| 5 | Accept losing the React Compiler rules from `eslint-plugin-react-hooks` v7? | **Yes.** They've never flagged anything here (lint is clean), and keeping ESLint installed for one plugin defeats the purpose. |
| 6 | Format `docs/**` and `.github/**` too? | **No.** Scope oxfmt to `src/`, `vite.config.ts`, and the root JSON configs. Markdown prose and workflow YAML stay hand-managed. |

Decision 4 means the `plugins` array should drop `unicorn` from the sketch in
Phase 1 step 2 — keep `["typescript", "react", "react-hooks", "oxc"]`. `oxc`
stays because its rules are correctness-category, not a new style layer.

Decision 6 means Phase 2 step 4's "decide after measuring" is already
settled: scope the scripts to the paths above.

## Follow-on plans

- `012` — adopt oxfmt's default style (semicolons, double quotes)
- `013` — enable oxfmt `sortImports`
- `014` — enable oxfmt `sortTailwindcss`
- `015` — TypeScript 7 upgrade (unblocked by this plan)

## Rejected approaches

- **Dual-run oxlint + ESLint via `eslint-plugin-oxlint`.** That path exists
  for large codebases migrating incrementally. This config is 25 lines and
  lint is already green — a clean cut is cheaper than maintaining two
  linters and their overlap suppression.
- **oxlint type-aware mode** (`options.typeAware`, `oxlint-tsgolint`). The
  current ESLint setup uses `tseslint.configs.recommended`, not the
  type-checked variant, so enabling type-aware linting here would be a new
  capability rather than parity — worth its own plan if wanted, and note it
  reintroduces a TypeScript-version coupling of its own.

## Risks

- **Different rules, not fewer rules.** oxlint's `correctness` is not a
  superset of ESLint recommended; some checks that pass today are simply
  not being made after this, and some new ones will fire. Phase 1 step 4
  is where that surfaces — budget for it rather than treating a red first
  run as a config error.
- **oxfmt is young** (0.65.0, pre-1.0) though it claims 100% pass on
  Prettier's JS/TS conformance tests and treats divergence as a bug. Pin
  the version rather than floating it, so a patch release can't silently
  reformat the tree in CI.
- **Nothing in this plan touches app behavior**, so `AGENTS.md`'s
  browser-verification rule doesn't apply — but the reformat commit does
  touch every file in `src/`, so run `yarn build` and `yarn test` after it
  and give the app one manual smoke load before merging.
