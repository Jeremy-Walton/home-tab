# badge

2026-07-03 — golden pair via CLI registry, three-way merge (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was CUSTOMIZED (same `transition-all` → `transition-[color,background-color]` tweak as `button.tsx`), preserved via `git merge-file` (radix golden as ancestor); the only conflict was the expected lib-alias normalization artifact.

## Changed

- `src/components/ui/badge.tsx` — replaced with the merged result. `Slot.Root` (`radix-ui`'s `Slot`, used for the `asChild` prop) → Base UI's `useRender`/`mergeProps` (`@base-ui/react/use-render`, `@base-ui/react/merge-props`) — the standard non-primitive Base UI pattern for a `render`-prop component with no dedicated Base UI part. `asChild` boolean prop is gone; replaced by a `render` prop (`badge.tsx:37`, `badge.tsx:48`), matching the project's existing base Button convention. `data-slot="badge"` / `data-variant={variant}` are no longer set as explicit JSX props — they're now emitted automatically via `useRender`'s `state: { slot: "badge", variant }` (`badge.tsx:49-52`; confirmed in `node_modules/@base-ui/react/use-render/useRender.d.ts`: "State properties are automatically converted to data-* attributes"), so the rendered DOM output is unchanged. The customized `transition-[color,background-color]` class (`badge.tsx:8`) survived the merge intact.
- `src/components/LinkTile.tsx:9` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. Only usage (`LinkTile.tsx:66`) passes `className` only, no `asChild`, so no call-site changes were needed.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/badge.tsx` and `src/components/LinkTile.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`aspect-ratio`, `dropdown-menu`, `tabs`, `tooltip`) — untouched, progressive mode.

## Behavior changes

None. `data-slot`/`data-variant` attribute output is unchanged (now derived from `useRender`'s `state` instead of being written by hand), and no consumer used `asChild`, so the `render`-prop swap has no observable effect today.

## Verify by hand

- Hover a link tile with a title: the badge (dark, semi-transparent, rounded pill over the background image) should render identically — same padding, truncation, and color per variant.
- No interactive behavior to check (badge is a static display element, not a control) — this is a visual-only check.
