# button

2026-07-03 — golden pair via CLI registry (three-way `git merge-file`, radix-luma golden as ancestor, base-luma golden as target). Migrated as a prerequisite dependency of alert-dialog (bottom-up rule). Verdict: clean, zero merge conflicts, user customization preserved.

## Changed

- `package.json` / `yarn.lock` — added `@base-ui/react` (installed with yarn 4, the project's package manager). Radix deps stay until the last component migrates.
- `src/components/ui/button.tsx` — rewritten on the real `@base-ui/react/button` primitive (`ButtonPrimitive.Props`), replacing the radix `Slot`/`asChild` pattern. Classified CUSTOMIZED: the user's cva base string differs from the stock radix-luma golden (`transition-[color,background-color,box-shadow,scale]` + `active:…:scale-[0.96]` instead of `transition-all` + `active:…:translate-y-px`); the three-way merge preserved it (`button.tsx:7`). The base-luma golden also drops `data-variant`/`data-size` attributes vs radix — verified nothing in `src/` selects on button's `data-variant`/`data-size`, so adopted as-is.
- `src/components/ui/alert-dialog.tsx` — consumer fix: the two `<Button … asChild>` wrappers around `AlertDialogPrimitive.Action`/`.Cancel` (base Button has no `asChild`) became `className={cn(buttonVariants({ variant, size }), className)}` directly on the radix parts (`alert-dialog.tsx:156`, `alert-dialog.tsx:172`). Interim state only — alert-dialog itself migrates next.
- Other Button consumers (`EmptyState`, `EditDialog`, `DashboardTabs`, `EntityOptionsMenu`, `ImportExportBar`, `ui/dialog.tsx`) were repointed one at a time with a typecheck each; after the finalize rename their imports are byte-identical to before (no `asChild` used directly on Button anywhere in app code — the `asChild` hits are on radix Tooltip/DropdownMenu/Dialog.Close triggers *wrapping* Button, which radix `Slot` handles fine against the base Button).

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/button.tsx` → no matches.

## Left alone

- `src/components/ui/badge.tsx` — has its own radix `Slot`/`asChild`; separate component, not part of this migration.
- `src/components/ui/dialog.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, etc. — still on radix by design (progressive mode); they interoperate with the base Button via radix `Slot`.

## Behavior changes

- Base Button no longer emits `data-variant`/`data-size` attributes (matches the base-luma registry golden). No selectors in this project used them.
- `@base-ui/react` Button is a real primitive (adds `render` prop, focusableWhenDisabled support); plain `<Button>` usage is unchanged.

## Verify by hand

- Click every button variant in the app (Add link, Import/Export, dialog buttons): press feel should still scale down (`scale-[0.96]`) on :active — that's the preserved customization.
- Tooltip on the dashboard-tabs / import-export buttons still opens on hover (radix Slot wrapping base Button).
- Dropdown trigger buttons (entity options menu) still open and show aria-expanded styling.
- Keyboard: Tab to a button, Enter/Space activates, focus ring visible.
