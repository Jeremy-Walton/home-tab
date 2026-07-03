# alert-dialog

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (only CLI alias/font-resolution artifacts vs the stock radix golden), so the base-luma golden was adopted verbatim after normalization.

## Changed

- `src/components/ui/alert-dialog.tsx` — replaced with the base-luma registry variant, normalized for this project (registry aliases → `@/lib/utils` / `@/components/ui/button`, `cn-font-heading` → `font-heading` per the project's figtree heading font, `"use client"` stripped per rsc:false). Part mapping: `Overlay` → `AlertDialogPrimitive.Backdrop` (keeps the `AlertDialogOverlay` export name, gains an `isolate` class from the golden), `Content` → `Portal > Backdrop > Popup`, `Action` → plain `Button` (Base UI has no auto-closing Action part), `Cancel` → `AlertDialogPrimitive.Close` with `render={<Button variant size />}` (`alert-dialog.tsx:157`).
- `src/components/ConfirmDialog.tsx` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. Call sites needed no changes: `open`/`onOpenChange` single-arg handler stays type-safe under Base UI's `(open, eventDetails)` signature; `AlertDialogAction variant="destructive" onClick` and `AlertDialogCancel onClick` pass through unchanged.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/alert-dialog.tsx` and `src/components/ConfirmDialog.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- `src/components/ui/dialog.tsx` — separate radix component (imports the base Button via radix `Slot`, which interoperates fine); migrate separately.
- Other radix wrappers (`dropdown-menu`, `tooltip`, `tabs`, `badge`, `separator`, `label`, `field`, `input`, `empty`, `aspect-ratio`) — untouched, progressive mode.

## Behavior changes

- **`AlertDialogAction` no longer closes the dialog automatically.** Radix's `Action` part closed on click; the Base UI golden renders a plain `Button`. Both call sites in this app (`DashboardTabs.tsx:45`, `LinkTile.tsx:93`) unmount the dialog themselves via `setConfirmingDelete(false)` in `onConfirm`, so no visible change here — but any future consumer must close the dialog itself from `onClick` (or use a form submit pattern).
- `AlertDialogCancel` now closes via Base UI's `Close` part; with `onOpenChange` wired to `onCancel`, a Cancel click still invokes `onCancel` both directly (its `onClick`) and via `onOpenChange(false)` — same double-invocation semantics as Radix, and it's idempotent here.
- Base UI alert dialog keeps modal alert semantics (no close on outside click; Esc still closes), matching Radix.

## Verify by hand

- Hover a link tile → delete (trash) → confirm dialog opens centered with backdrop blur; page behind is inert.
- Click **Delete**: link is removed and the dialog goes away (this exercises the Action delta above).
- Click **Cancel**: dialog closes, nothing deleted. Press **Esc**: same. Click the backdrop: dialog must **stay open** (alert semantics).
- Same three checks for dashboard delete (menu on a dashboard tab; delete is disabled when only one dashboard exists).
- Focus: after the dialog closes, focus should return to the page without a visible jump; Tab inside the open dialog cycles Cancel/Delete only.
