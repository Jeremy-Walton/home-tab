# 015 — Upgrade to TypeScript 7

Move `typescript` from `~6.0.2` (installed: 6.0.3) to 7.x (current latest:
7.0.2). **Depends on `011` having landed** — that's what removes the blocker.

## Why it was blocked, and why it isn't any more

`docs/TECHNICAL_DESIGN.md`'s "Open Items" records the pin: `typescript-eslint`
hard-throws on any TS `>= 7` — an unconditional version check in its source,
not a peer-dependency range that could be overridden — and had no released or
canary version lifting the guard
([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).

Plan `011` deletes `typescript-eslint` outright. oxlint does not embed the
TypeScript compiler for the rules this project uses (`plugins: ["typescript"]`
is syntactic, non-type-checked), so nothing in the lint path cares what
version of `typescript` is installed. The same open item also notes yarn is
already on 4.17.1+, whose bundled TypeScript compatibility patch understands
TS 7's restructured `lib/` layout — so the package-manager side was never the
constraint either.

What remains is doing the upgrade and proving the rest of the toolchain
copes. That's real work, not a version bump, which is why it's its own plan.

## What has to be re-verified

TS 7 is the Go port — a reimplementation, not an incremental release. The
things most likely to surface here:

1. **`tsc -b` project references.** `tsconfig.json` is a solution-style file
   (`"files": []` + two references), and both leaf configs write
   `tsBuildInfoFile` into `node_modules/.tmp/`. Build-mode and incremental
   state are exactly the area a rewrite is most likely to differ in.
   Delete `node_modules/.tmp/` before the first TS 7 build so a stale
   `.tsbuildinfo` from TS 6 can't mask or fake a result.
2. **Strict-ish compiler options already in use** — `verbatimModuleSyntax`,
   `erasableSyntaxOnly`, `moduleResolution: "bundler"`,
   `allowImportingTsExtensions`, `noUnusedLocals`/`noUnusedParameters`.
   These are all supported, but `erasableSyntaxOnly` and
   `verbatimModuleSyntax` interact with how `import type` is written, and
   diagnostics may differ in wording or strictness.
3. **`skipLibCheck: true` is set in both leaf configs**, which hides a large
   class of dependency-typing breakage. That's a mixed blessing: the upgrade
   will look cleaner than it is. Consider one throwaway run with
   `skipLibCheck: false` to see what the dependency tree actually looks
   like under TS 7 — informational only, not a change to commit.
4. **Dependency type packages**: `@types/react` 19.x, `@types/react-dom`,
   `@types/node` 26.x, plus `vite/client` types and RxDB's own bundled
   types. RxDB is the heaviest typing surface in the project.
5. **Vite / Vitest / `@vitejs/plugin-react`.** These transpile rather than
   typecheck, so they're unlikely to break — but `vite.config.ts` is itself
   TypeScript loaded through Vite's own pipeline, and `vitest.config`
   resolution goes through the same path.
6. **Editor**: VS Code needs its TypeScript version pointed at the
   workspace copy to match CI. `.vscode/` is gitignored here, so this is a
   per-developer note, not a committed setting.

## Phases

### Phase 1 — bump and build

1. `yarn up typescript@^7` (dropping the `~6.0.2` pin's tilde constraint).
2. `rm -rf node_modules/.tmp` — see re-verification item 1.
3. `yarn tsc -b`. Fix real errors; **do not loosen a compiler option to get
   to green.** If a strict option genuinely can't survive, that's a finding
   worth recording in this plan rather than silently relaxing.

### Phase 2 — the rest of the toolchain

1. `yarn lint` (oxlint — expected to be entirely unaffected, but confirm).
2. `yarn test` — the full Vitest suite (81 tests / 7 files at time of
   writing), including the RxDB-backed `AppStateContext.test.tsx`, which is
   the most type-heavy test in the project.
3. `yarn build` — the full `tsc -b && vite build` path.
4. `yarn dev` and load the app. Per `AGENTS.md`, a green toolchain is not
   evidence the app works in this repo.

### Phase 3 — record it

1. `docs/TECHNICAL_DESIGN.md`:
   - "Stack": TypeScript version note, if the doc names one.
   - **"Open Items": delete the `typescript` pin item entirely** — both
     halves of it (the typescript-eslint guard and the yarn patch) are
     resolved. Don't leave it rewritten-but-present.
2. If anything in "What has to be re-verified" turned out to bite, add it
   to "Known Gotchas" — that section is the right home for a surprising
   constraint, per the repo's documentation rules.
3. Delete this plan file in the commit that lands the work.

## Risks

- **A rewrite-scale compiler change with `skipLibCheck: true` masking the
  dependency surface.** The upgrade can pass cleanly and still leave
  latent typing problems in RxDB or React types that only appear when a
  future change touches them.
- **No rollback cost.** Nothing else in the plan depends on TS 7; if it
  goes badly, re-pin to `~6.0.3` and the only loss is the time. Worth
  saying explicitly, because it means this can be attempted speculatively
  rather than scheduled.
- **`typescript-eslint`'s guard existing at all is a reminder** that other
  ecosystem tools may carry their own TS version assertions. oxlint and
  Vite are the only two that could here, and neither embeds `tsc`.
