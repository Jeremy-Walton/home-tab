# 013 — Enable oxfmt `sortImports`

Turn on oxfmt's built-in import sorting. Depends on `011` having landed.
Independent of `012` and `014` — order between them doesn't matter, but each
should land as its own commit.

## What it is

`sortImports` uses the same algorithm as
[`eslint-plugin-perfectionist/sort-imports`](https://perfectionist.dev/rules/sort-imports),
built into the formatter rather than as a lint rule with a fixer. Relevant
option defaults:

| Option | Default | Note |
|---|---|---|
| `order` | `"asc"` | |
| `ignoreCase` | `true` | |
| `newlinesBetween` | `true` | Inserts blank lines between groups — this is what makes the diff visible, not just reordered. |
| `sortSideEffects` | `false` | **Keep this off.** Side-effect imports are order-sensitive; the default is the safe one. |
| `partitionByNewline` | `false` | If `true`, an existing blank line freezes sorting across it. |
| `internalPattern` | `["~/**", …]` | Doesn't match this repo — see below. |
| `groups` | predefined | The knob that decides where relative imports land. |

## The one thing that needs a decision

This project imports by **relative path** (`'../context/useAppState'`,
`'./ui/aspect-ratio'`), not via the `@/*` alias, even though
`tsconfig.json` and `components.json` define one. So `internalPattern`'s
default (`~/**`-style) matches nothing here and every first-party import
falls into the relative-import group.

That's fine — relative imports sort as one group after external packages,
which is roughly what the files already do by hand. But confirm it on real
output before committing rather than assuming.

## Phases

### Phase 1 — configure and measure

1. Add to `.oxfmtrc.json`:

```json
{
  "sortImports": true
}
```

2. `yarn oxfmt --list-different` — expect most of `src/` to be listed
   (nearly every file has more than one import).
3. Spot-check the actual output on three files with different import
   shapes before going further:
   - `src/components/LinkTile.tsx` — mixed external + several relative
   - `src/main.tsx` — has side-effect imports (fonts, CSS); **verify these
     did not move**
   - `src/components/ui/dropdown-menu.tsx` — Base UI + local `cn()` helper
4. If relative-import grouping reads badly, set an explicit `groups` array
   rather than accepting the default; that's the intended escape hatch.

### Phase 2 — apply

1. `yarn format`, land as a single mechanical commit.
2. Add the SHA to `.git-blame-ignore-revs`.

### Phase 3 — verify

1. `yarn lint`, `yarn tsc -b`, `yarn test`, `yarn build`.
2. **Load the app in a browser.** Import order is exactly the class of
   change that can break at runtime while every static check passes —
   CSS import order in `src/main.tsx` decides Tailwind layer precedence,
   and `src/index.css` carries the `@theme` motion tokens the whole UI
   depends on. Check that fonts render and dialogs/popups still animate.
3. `docs/TECHNICAL_DESIGN.md` "Stack": note that import order is
   formatter-enforced.
4. Delete this plan file in the commit that lands the work.

## Risks

- **Side-effect import reordering** is the only real one, and
  `sortSideEffects: false` prevents it. Do not turn that on.
- **`src/index.css`'s own `@import`/`@theme` ordering** is not touched by
  `sortImports` (that's CSS, and the option is JS/TS-only) — but
  `main.tsx`'s import of it relative to `@fontsource-variable/*` is.
  Phase 3 step 2 is the check for this.
