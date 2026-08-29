# 012 — Adopt oxfmt's default style

Drop the two style overrides plan `011` kept (`semi: false`,
`singleQuote: true`) and run on oxfmt's defaults: semicolons at the ends of
statements, double quotes in TS/JS. Depends on `011` having landed.

## Why do this at all

The repo's current style — no semicolons, single quotes — is a habit, not a
decision anything in the codebase depends on. Running on defaults means:

- The config file shrinks to (near) nothing, so there's no per-project style
  to remember or re-litigate.
- It matches Prettier's defaults, which is what most other tooling, code
  samples, and generated files (shadcn output, `npx shadcn add …`) already
  emit — today every generated file has to be re-styled by hand or by the
  formatter.
- ASI edge cases stop being a thing anyone has to think about.

The counter-argument is that it buys nothing functional and costs a
whole-repo diff. That's why it's split out rather than bundled into `011`:
the diff should be a deliberate, isolated act.

## Scope

`src/**` plus `vite.config.ts` — the same scope `011` established. Every
`.ts`/`.tsx` file in the repo changes.

## Phases

### Phase 1 — flip the config

1. Remove `semi` and `singleQuote` from `.oxfmtrc.json`, leaving the
   `$schema` line and whatever `ignorePatterns` `011` set.
2. `yarn oxfmt --list-different` to confirm the blast radius is what's
   expected (all of `src/`, nothing outside the configured scope).

### Phase 2 — reformat

1. `yarn format` in one shot.
2. Land it as a **single commit containing nothing else**, message making
   clear it's mechanical (e.g. `Reformat to oxfmt defaults`).
3. Add that commit's SHA to `.git-blame-ignore-revs` (create the file if
   `011` didn't), and confirm it's wired up:
   `git config blame.ignoreRevsFile .git-blame-ignore-revs`. GitHub picks
   the file up automatically; local clones need that config line, so note
   it in `AGENTS.md`.

### Phase 3 — verify

1. `yarn lint`, `yarn tsc -b`, `yarn test`, `yarn build` — all must pass
   unchanged.
2. **Load the app in a browser once.** A formatter shouldn't change
   behavior, but this repo's `AGENTS.md` rule exists because typecheck,
   lint, and tests have repeatedly missed real breakage. A diff touching
   every source file is exactly when to honour it.
3. `docs/TECHNICAL_DESIGN.md` "Stack": update the formatting note to say
   the project runs oxfmt on defaults with no style overrides.
4. Delete this plan file in the commit that lands the work.

## Risks

- **`git blame` noise** across the whole codebase — mitigated by the
  ignore-revs file, which only works for people who've set the config or
  are reading on GitHub.
- **In-flight branches will conflict on nearly every file.** Land this when
  no significant branch is open, or expect to re-run `yarn format` on the
  branch after merging `main` in and take the formatter's output.
- **No functional risk beyond ASI**, which oxfmt handles by construction —
  adding semicolons to already-correct code can't change parsing.
