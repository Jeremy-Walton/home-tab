# aspect-ratio

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`), with one hand-fix on top. Verdict: wrapper was PRISTINE vs the radix golden; Base UI has no AspectRatio primitive, so the base-luma golden replaces `AspectRatioPrimitive.Root` with a plain `<div>` sized via a CSS `--ratio` custom property — adopted, but with the `style` prop merge corrected (see below).

## Changed

- `src/components/ui/aspect-ratio.tsx` — replaced with the base-luma registry variant (`AspectRatioPrimitive.Root` → `<div style={{"--ratio": ratio}} className="relative aspect-(--ratio)">`), **with one deviation from the raw registry output**: the registry's own base-luma variant sets `style={{"--ratio": ratio}}` and then spreads `{...props}` *after* it, so any consumer-supplied `style` prop silently clobbers `--ratio` instead of merging with it (JSX duplicate-key spread, last write wins). This project's sole consumer (`LinkTile.tsx:47`) passes `style={backgroundStyle}` for the background image — under the raw registry code the aspect-ratio sizing would have silently broken. Fixed by destructuring `style` out of `props` and merging it explicitly (`aspect-ratio.tsx:5,10-13`: `style={{...style, "--ratio": ratio}}`) instead of letting the spread clobber it. This is a correctness fix, not a stylistic customization — Radix's original `AspectRatioPrimitive.Root` merged consumer `style` correctly internally, so this preserves prior behavior rather than changing it.
- `src/components/LinkTile.tsx:8` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. Passes `ratio={16 / 9}`, `style`, `className`, and children (`LinkTile.tsx:47-86`) — all still valid props on the new `React.ComponentProps<"div"> & { ratio: number }` signature; no `asChild` was used, so no call-site changes were needed.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/aspect-ratio.tsx` and `src/components/LinkTile.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`dropdown-menu`, `tabs`, `tooltip`) — untouched, progressive mode.

## Behavior changes

None (with the style-merge fix in place). Without that fix, this would have been a visible regression — the link tile's aspect-ratio box would have collapsed to its content's natural height, since `--ratio` would never reach the DOM once `style={backgroundStyle}` clobbered it. Flagging the registry gap here in case other `base-luma` consumers hit the same pattern in a whole-project migration.

## Verify by hand

- Load the dashboard: every link tile should keep its 16:9 aspect-ratio box (not collapse to a thin strip or the image's natural size).
- A tile with a valid `backgroundImageUrl`: image renders as the tile's cover background, filling the 16:9 box exactly as before.
- A tile with a broken/missing background image URL: falls back to the muted background color, same 16:9 box shape (unaffected by this migration, but worth a quick look since it shares the same style path).
