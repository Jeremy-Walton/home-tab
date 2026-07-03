# dialog

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (only CLI icon-placeholder resolution differed vs the stock radix golden — same as `button`/`alert-dialog`), so the base-luma golden was adopted verbatim after normalization.

## Changed

- `src/components/ui/dialog.tsx` — replaced with the base-luma registry variant, normalized for this project (registry aliases → `@/lib/utils` / `@/components/ui/button`, icon placeholder resolved to the project's phosphor `XIcon` import, `"use client"` stripped per rsc:false). Part mapping: `Overlay` → `DialogPrimitive.Backdrop` (keeps the `DialogOverlay` export name), `Content` → `Portal > Backdrop > Popup` (keeps the `DialogContent` export name), header close button and footer's optional `showCloseButton` `Close` both move from `asChild` to `render={<Button .../>}` (`dialog.tsx:62`, `dialog.tsx:116`). `Root`/`Trigger`/`Close`/`Title`/`Description` are thin, unchanged pass-throughs of the corresponding Base UI parts.
- `src/components/EditDialog.tsx` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. Uses `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` only (no `DialogTrigger`, no `DialogClose`, no `asChild` at the call site), so no props changed. `open onOpenChange={(open) => !open && onClose()}` (`EditDialog.tsx:25`) stays type-safe under Base UI's `(open, eventDetails)` signature.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/dialog.tsx` and `src/components/EditDialog.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`tabs`, `aspect-ratio`, `separator`, `tooltip`, `dropdown-menu`, `badge`, `label`) — untouched, progressive mode.

## Behavior changes

None. Unlike `AlertDialogAction`, Base UI's `Dialog.Close` (verified in `node_modules/@base-ui/react/dialog/close/DialogClose.js`) does call `store.setOpen(false)` on click itself — the header X button and the footer's optional `showCloseButton` Close both still auto-close the dialog, matching Radix's `Dialog.Close` behavior exactly. `EditDialog`'s Cancel/Save buttons are plain `Button`s wired to explicit handlers, not `DialogClose`, so they're unaffected either way.

## Verify by hand

- Open an edit dialog (e.g. edit a link tile): dialog appears centered with backdrop blur; page behind is inert (Tab doesn't escape it).
- Click the header **X** close button: dialog closes without saving (exercises the `Close` render-prop delta from `asChild`).
- Click **Cancel**: dialog closes without saving. Click **Save**: `onSave` runs, then dialog closes.
- Press **Esc**: dialog closes (equivalent to Cancel, no save).
- After closing by any path, focus should return to the triggering element without a visible jump.
