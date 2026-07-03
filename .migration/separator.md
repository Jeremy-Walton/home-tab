# separator

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (byte-identical to the stock radix golden), so the base-luma golden was adopted verbatim.

## Changed

- `src/components/ui/separator.tsx` — replaced with the base-luma registry variant. `SeparatorPrimitive.Root` (`radix-ui`'s `Separator`) → Base UI's `Separator` (default export renders a `<div role="separator">` directly, no `.Root` sub-part). The `decorative` prop and its `decorative={true}` default are dropped entirely — Base UI's `Separator` has no such prop (confirmed in `node_modules/@base-ui/react/separator/Separator.d.ts`); see Behavior changes below. `orientation` and all styling classes pass through unchanged.
- `src/components/ui/field.tsx:6` — sole consumer (`FieldSeparator`, `field.tsx:161`); repointed during the strangler step, byte-identical after the finalize rename. It doesn't pass `decorative`, so no type error; the prop's disappearance couldn't surface here. **Note**: `FieldSeparator` itself has no consumers in app code yet (exported but unused), so this migration currently has zero live behavior surface.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/separator.tsx` and `src/components/ui/field.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`tabs`, `aspect-ratio`, `tooltip`, `dropdown-menu`, `badge`) — untouched, progressive mode.

## Behavior changes

- **The separator is now always exposed to assistive tech as `role="separator"`.** Radix's wrapper defaulted `decorative={true}`, which renders `role="none"` (hidden from the accessibility tree) unless a consumer explicitly opted out. Base UI's `Separator` (per its own docs: "A separator element accessible to screen readers") has no decorative mode — it's unconditionally announced. No current call site passes `decorative={false}` or relies on the decorative default, and `FieldSeparator` has no live consumers today, so this has no visible effect yet — but any future consumer of a purely visual (non-semantic) separator will get an extra a11y-tree node it wouldn't have gotten before.

## Verify by hand

- No live UI surface exercises this today (`FieldSeparator` is unused). If/when it's wired into a form: visually confirm the separator still renders as a thin full-width (or full-height, if vertical) line matching surrounding spacing — purely a style check, no interaction to test.
