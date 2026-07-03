# label

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (byte-identical to the stock radix golden apart from `"use client"`/lib-path normalization artifacts). Base UI has no Label primitive, so the base-luma golden swaps `LabelPrimitive.Root` for a plain native `<label>` — adopted verbatim.

## Changed

- `src/components/ui/label.tsx` — replaced with the base-luma registry variant: `LabelPrimitive.Root` (`radix-ui`'s `Label`) → native `<label data-slot="label" ...>`. Classes, `data-slot`, and all other props pass through unchanged. No Base UI Label part exists (per the migration's hard rules) — a native element is the correct target, not a gap.
- `src/components/ui/field.tsx:5` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. `FieldLabel` (`field.tsx:99`) types its props as `React.ComponentProps<typeof Label>`, which now resolves to `React.ComponentProps<"label">` instead of the Radix primitive's props — a strict superset for this file's usage (no Radix-specific props like `asChild` were used), so no call-site changes were needed.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/label.tsx` and `src/components/ui/field.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`tabs`, `aspect-ratio`, `separator`, `tooltip`, `dropdown-menu`, `badge`) — untouched, progressive mode.

## Behavior changes

None. A native `<label>` is a strict behavioral match for Radix's `Label.Root` here — both just render a `<label>` element with click-to-focus/select semantics on the associated control; Radix's wrapper added no extra behavior beyond that.

## Verify by hand

- Open any form-bearing dialog (e.g. edit a link tile): field labels render with the same text, spacing, and weight as before.
- Click directly on a label's text: it should focus/activate its associated input, exactly as before (native `<label>`+`for`/wrapping behavior).
- Check a disabled field (if any in this app): label should still visually dim (`peer-disabled`/`group-data-[disabled=true]` classes unchanged).
