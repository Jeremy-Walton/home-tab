# 010 — Animation polish

- **Status**: TODO
- **Commit when written**: `591bd52`
- **Source**: `/improve-animations` audit (2026-07-28) — 7 findings + 3 missed
  opportunities, each re-verified at its `file:line` before being written up.

Execute the phases **in order**. Each phase ends with a **PAUSE** — stop, report,
and wait for approval before starting the next. Update this file's phase status
(and any decision that changed) before moving on.

## Phase status

| # | Phase | Severity | Status |
|---|-------|----------|--------|
| 1 | Motion tokens + popup easing/duration | MEDIUM | DONE (pending browser verify) |
| 2 | Dialog exit animations actually play | HIGH | TODO |
| 3 | `prefers-reduced-motion` support | MEDIUM | TODO |
| 4 | Press feedback on link tiles and the add tile | MEDIUM | TODO |
| 5 | `transition-all` + drop-target ring timing | LOW | TODO |
| 6 | Fade link background images in on load | — (opportunity) | TODO |
| 7 | Empty-state entrance | — (opportunity) | TODO |
| 8 | View Transitions for delete reflow (fenced) | — (opportunity) | TODO |

---

# Handoff — context for a fresh session

Everything below was established in the session that produced this plan. It is
written for an agent starting cold. **Read it before executing any phase**; most
of it cannot be re-derived from the diff, and some of it contradicts what a
reasonable person would assume.

## What this plan is

A motion audit of the whole app, turned into phased work. The bar is Emil
Kowalski's animation philosophy as encoded in
`.claude/skills/improve-animations/AUDIT.md` — read that file for the rationale
behind any value in this plan. **Never approximate a curve or duration**; every
number here was copied from that catalog, not invented.

## The single most important rule in this codebase

**Keyboard-initiated and high-frequency actions must not animate.** In this app
that specifically means:

- Dashboard switching (⌥1–⌥0, ⌥←/⌥→, ⌥[/⌥]) and the grid/background swap it
  causes.
- The held-⌥ digit badges on the tab strip (`DashboardTabs.tsx:47-55`).

Both are correct as they are. An agent "improving the animations" will be
tempted to add a crossfade to the dashboard switch — that is a **regression**,
not an improvement, and it was explicitly rejected during the audit. Nothing in
any phase touches them.

The frequency ladder that drives every severity call here: 100+/day → no
animation ever; tens/day → minimal; occasional (modals, menus) → standard;
rare/first-run → delight allowed.

## Verified facts — do not re-derive these

Each was checked against `node_modules` or the repo during the audit. Line
numbers are as of commit `591bd52`.

| Fact | Evidence |
|------|----------|
| `tw-animate-css` builds enter/exit as `enter var(--tw-animation-duration, var(--tw-duration, .15s)) var(--tw-ease, ease)` — so **every** popup animation in this repo currently runs on CSS `ease` at the `duration-*` the class sets | `node_modules/tw-animate-css/dist/tw-animate.css`, `--animate-in` / `--animate-out` |
| Tailwind v4 transition defaults are 150ms / `cubic-bezier(0.4, 0, 0.2, 1)` | `node_modules/tailwindcss/theme.css:492-493` |
| Tailwind v4 already defines `--ease-out: cubic-bezier(0, 0, 0.2, 1)`, so redefining it would silently change every existing `ease-out` utility | `node_modules/tailwindcss/theme.css:435-436` |
| The `--ease-*` theme namespace generates `ease-*` utilities that set `--tw-ease`, which is exactly what `tw-animate-css` reads. This is why one class restyles both `animate-in` and `animate-out` | `--tw-ease` emitted by `node_modules/tailwindcss/dist/lib.mjs` |
| Tailwind v4's `scale-*` utilities set the standalone CSS `scale` property, not `transform` — so press feedback cannot collide with dnd-kit's inline `transform` | `ui/button.tsx:7` lists `scale` in its `transition-[…]` property list |
| `onOpenChangeComplete` exists on Base UI's `Dialog.Root` | `node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts:44` |
| …and is inherited by `AlertDialog.Root`, which omits only `modal`, `disablePointerDismissal`, `onOpenChange`, `actionsRef`, `handle` | `node_modules/@base-ui/react/alert-dialog/root/AlertDialogRoot.d.ts:13` |
| Base UI runs the completion callback **immediately** when `element.getAnimations` is not a function (the jsdom case), so Phase 2 does not hang the test suite. `globalThis.BASE_UI_ANIMATIONS_DISABLED` is the documented escape hatch on that same line | `node_modules/@base-ui/react/internals/useAnimationsFinished.js:42` |
| `AspectRatio` is already `relative`, so Phase 6's absolutely-positioned image needs no extra class | `src/components/ui/aspect-ratio.tsx:18` |
| dnd-kit positions tiles with `CSS.Translate.toString(transform)` — translate only, never scale | `src/components/LinkTile.tsx:35` |
| The dev server serves under the Pages base path: **`http://localhost:5173/home-tab/`**, not `/` | `vite.config.ts:7` |

## Repo rules that bind this work

From `AGENTS.md` and `docs/TECHNICAL_DESIGN.md`:

- **Run all three checks** — `yarn lint`, `yarn tsc -b`, `yarn test`. None of
  them catches what the others do.
- **UI changes must be verified in a real browser.** Every real bug found in
  this repo so far was invisible to typecheck, lint, and tests, and only showed
  up when clicking or dragging. That is why every phase below has a Browser test
  section. **The repo owner runs these themselves** — do not launch a browser
  or a dev server proactively; hand them the steps and wait.
- **`src/components/ui/` is owned project code, not vendor files.** Recurring
  *stylistic* decisions get baked into the primitive there; *compositions* live
  in `src/components/`. Both kinds of edit appear in this plan and are placed
  accordingly.
- **Comments explain _why_, never how or where something is used.** Do not add
  comments naming callers.
- **Never commit** unless the repo owner says "commit" in the moment.
- Plans live in `docs/plans/NNN-kebab-slug.md`; numbers are never reused (001–009
  are spent, including a deleted top-level `plans/` set). **This file is deleted
  in the commit that lands the final phase**, along with its fixture directory.

## Known gotchas that intersect these phases

Read `docs/TECHNICAL_DESIGN.md`'s "Known Gotchas" in full before Phase 4 or 8.
The load-bearing ones here:

- **Drag-and-drop reorder has a three-bug history** (flex-wrap vs
  `rectSortingStrategy`; N concurrent writes causing partial-reorder emissions;
  a settle-after-drop correction that once threw a tile to `(1082, -147)`
  off-screen). The fixes were: CSS Grid + `closestCenter`, optimistic local
  state + one `bulkUpsert`, the `linksEqual` guard, and `animateLayoutChanges`.
  **Do not undo any of them.** This is why Phase 8 uses the View Transitions API
  instead of animating the grid directly.
- **A real drag still fires a native `click` afterward**, suppressed by a
  window-level capture listener in `useLinkDragAndDrop.ts`. Any change near the
  tile's press/click behavior (Phase 4) must be re-checked by actually dragging.
- **Base UI's `AlertDialogAction` does not auto-close** the way Radix's did.
  Phase 2 depends on knowing this.

## Decisions already made

| Decision | Choice | Why |
|----------|--------|-----|
| Easing token names | `--ease-out-strong`, `--ease-in-out-strong` | Overriding Tailwind's built-in `--ease-out` would change every existing `ease-out` utility in the app. |
| Where tokens live | A new plain `@theme { }` block in `src/index.css`, **not** the existing `@theme inline` | `inline` does not emit the custom property to `:root`; Phase 8 needs `var(--ease-in-out-strong)` from raw CSS. |
| Dialog durations | 200ms in / 150ms out | AUDIT's modal band is 200–500ms; the current `duration-100` sits below it. Exits are deliberately faster than entrances. |
| Dropdown / tooltip durations | 150ms in / 100ms out | AUDIT: dropdowns 150–250ms, tooltips 125–200ms. |
| Grid reflow on add/delete | View Transitions API, **delete only**, fenced in Phase 8 | Chosen by the repo owner over "skip" and "entrance-only". Chrome-only is fine (the PRD is Chrome-first) and it avoids dnd-kit's transform math entirely. |
| Empty-state entrance | Animate on **every** mount, no gating state | Chosen by the repo owner. It replays when ⌥-switching to an empty dashboard; judged rare enough in practice not to buy state for. |
| Browser test data | A checked-in fixture imported through the app's own Import menu | Chosen by the repo owner over a console snippet or manual setup — it exercises a supported code path and is re-importable mid-plan. |

## Scope

- `src/index.css` (phases 1, 3, 8)
- `src/components/ui/dialog.tsx`, `ui/alert-dialog.tsx`, `ui/dropdown-menu.tsx`,
  `ui/tooltip.tsx` (phase 1)
- `src/components/EditDialog.tsx`, `ConfirmDialog.tsx`, `ShortcutsDialog.tsx`,
  `ImportExportBar.tsx` (phase 2)
- `src/components/LinkTile.tsx` (phases 4, 6, 8)
- `src/components/DashboardGrid.tsx` (phase 4)
- `src/components/ui/tabs.tsx`, `DashboardTabs.tsx` (phase 5)
- `src/components/EmptyState.tsx` (phase 7)
- `src/context/AppStateContext.tsx` (phase 8)
- `docs/plans/fixtures/animation-test-data.json` (test fixture, no app code)

## Global boundaries

- **Do not add dependencies.** Everything here uses Tailwind v4,
  `tw-animate-css`, Base UI, and platform APIs already present.
- **Do not animate dashboard switching or the ⌥ badges** (see above).
- If the code at a cited line does not match what this plan quotes (drift since
  `591bd52`), **stop and report** rather than improvising.

---

# Browser test setup

Do this once before Phase 1, and again any time the data gets chewed up by
testing. Every phase's Browser test section assumes it.

1. **Start the dev server**: `yarn dev`
2. **Open** `http://localhost:5173/home-tab/` in Chrome — note the `/home-tab/`
   path, which comes from `vite.config.ts:7`.
3. **Load the fixture**: click the **⋯** button at the far right of the top bar
   → **Import** → choose `docs/plans/fixtures/animation-test-data.json`.
   Import is an upsert by id, so re-importing at any point restores the fixture
   without duplicating it or touching your own dashboards.

That gives you three dashboards:

| Dashboard | Contents | What it's for |
|-----------|----------|---------------|
| **Motion QA** | 12 tiles ("Tile 01"–"Tile 12"), spanning multiple rows at a normal window width. 8 have working images, 3 have none, "Tile 05" points at a 404 | Reflow, drag, press, image loading |
| **Backgrounds** | 3 tiles, and a dashboard background image | Dashboard background behavior, move-a-link-to-another-dashboard |
| **Empty** | no links | The empty-state card |

Tiles are numbered on purpose: `TECHNICAL_DESIGN.md` records that reorder bugs
must be tracked **by visible identity, not DOM index**, because indexes change
across a reorder. Watch the titles.

### DevTools recipes used below

- **Slow-motion**: `⌘⇧P` → "Show Animations" → set playback speed to **10%**,
  then trigger the interaction. The panel captures the animation group so you
  can scrub it.
- **Reduced motion**: `⌘⇧P` → "Show Rendering" → *Emulate CSS
  `prefers-reduced-motion`* → `reduce`.
- **Slow network**: Network tab → throttling dropdown → **Slow 4G**. The
  *Disable cache* checkbox in the same toolbar controls the cached-image case.

### Mechanical checks (every phase)

```
yarn lint && yarn tsc -b && yarn test
```

---

## Phase 1 — Motion tokens + popup easing and duration

**Severity**: MEDIUM · **Category**: Easing & duration, Cohesion & tokens

### Problem

The repo defines no motion tokens. `src/index.css` sets colors, radii, and fonts
in `@theme inline` (lines 9–50) but no easing or duration, so every animation
falls back to library defaults — and no popup in this repo sets an `ease-*`
utility, which means **every entrance and exit runs on CSS `ease`**, a curve that
ramps *in* at the start, delaying the exact moment the user is watching.

```tsx
/* src/components/ui/dialog.tsx:32 — backdrop */
"fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

/* src/components/ui/dialog.tsx:54 — popup */
"... shadow-xl ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-md ..."

/* src/components/ui/dropdown-menu.tsx:43 and :140 */
"... shadow-lg ring-1 ring-foreground/5 duration-100 outline-none ..."

/* src/components/ui/tooltip.tsx:51 — no duration at all, so 150ms via the --tw-duration fallback */
"z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 ..."
```

Dialogs additionally run at `duration-100`, below the 200–500ms modal band.

### Target

```css
/* src/index.css — new block, immediately after the existing `@theme inline { … }` block */
@theme {
    --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
}
```

| Surface | Enter | Exit | Easing |
|---------|-------|------|--------|
| Dialog + alert-dialog popup & backdrop | 200ms | 150ms | `ease-out-strong` |
| Dropdown menu popup & submenu popup | 150ms | 100ms | `ease-out-strong` |
| Tooltip popup | 150ms | 100ms | `ease-out-strong` |

`data-open:` / `data-closed:` are the right variants — Base UI already drives the
existing `data-open:animate-in` / `data-closed:animate-out` classes on these same
elements.

### Steps

1. `src/index.css` — add the `@theme { … }` block above immediately after the
   closing brace of the existing `@theme inline { … }` block (after line 50).
   Do not modify the `@theme inline` block.
2. `src/components/ui/dialog.tsx:32` and `:54` — in each class string, replace
   the single token `duration-100` with
   `ease-out-strong data-open:duration-200 data-closed:duration-150`.
3. `src/components/ui/alert-dialog.tsx:31` and `:53` — same replacement.
4. `src/components/ui/dropdown-menu.tsx:43` and `:140` — replace `duration-100`
   with `ease-out-strong data-open:duration-150 data-closed:duration-100`.
5. `src/components/ui/tooltip.tsx:51` — no duration token exists; insert
   `ease-out-strong data-open:duration-150 data-closed:duration-100 `
   immediately after the leading `z-50 `. Leave the `data-[state=delayed-open]:*`
   classes untouched.

### Boundaries

- Do NOT change any `zoom-in-95` / `zoom-out-95` / `slide-in-from-*` value —
  those are already correct (nothing in this repo uses `scale(0)`).
- Do NOT change `origin-(--transform-origin)` on the dropdown or tooltip; both
  already scale from their trigger.
- Do NOT touch `ui/button.tsx` — its `active:scale-[0.96]` at 150ms is already
  inside the press-feedback band.
- Do NOT touch `DashboardTabs.tsx` or `DashboardGrid.tsx` in this phase.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test` — all pass.
- `yarn build`, then `grep -r "0.23, 1, 0.32, 1" dist/assets/*.css` — must match.
  If it does not, the theme namespace did not generate the utility: **stop and
  report** rather than hand-writing the cubic-bezier into each component.

### Browser test

Setup as above, on **Motion QA**.

1. **Dropdown easing** — hover a tile, click its **⋯** button. The menu should
   arrive fast and settle softly, with no slow ramp at the start.
2. **Slow-motion check** — open the Animations panel at 10% playback, then open
   the same menu. Watch for two things: it grows from the **corner nearest the
   ⋯ button**, not from its center; and it decelerates into place rather than
   easing in and out symmetrically.
3. **Dialog timing** — open a tile's **⋯ → Edit**. The dialog should feel
   slightly more deliberate than before (200ms rather than 100ms), and the
   backdrop blur should come in with it.
4. **Asymmetry** — press **Cancel**. Closing should feel quicker than opening.
   *Expect the close to still snap out instantly at this phase* — the exit
   animation itself is Phase 2's job; you're only checking that the open felt
   right.
5. **Tooltips** — hover the **+** button and the **⋯** button in the top bar.
   Tooltips should appear immediately with a small, soft scale-up.

**Pass**: entrances decelerate, popups grow from their trigger, dialogs are
noticeably less abrupt than before. **Fail**: any popup still ramps up slowly at
the start, or a menu appears to grow from its middle.

**Done when**: the four `ui/` popup surfaces carry `ease-out-strong` and explicit
open/closed durations, and no `duration-100` remains in those files.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 2 — Dialog exit animations actually play

**Severity**: HIGH · **Category**: Interruptibility / lifecycle

### Problem

Every dialog is conditionally mounted by its parent with `open` hard-coded to
`true`. Closing calls `onClose`, which flips the parent's state and **unmounts
the whole subtree in the same commit** — so Base UI never applies its
`data-closed` state, and `data-closed:animate-out` / `data-closed:fade-out-0` on
the popup *and its blurred backdrop* never run. Dialogs fade in, then vanish in a
single frame.

```tsx
/* src/components/EditDialog.tsx:25 */
<Dialog open onOpenChange={(open) => !open && onClose()}>

/* src/components/ConfirmDialog.tsx:19 */
<AlertDialog open onOpenChange={(open) => !open && onCancel()}>

/* src/components/ShortcutsDialog.tsx:7 */
<Dialog open onOpenChange={(open) => !open && onClose()}>

/* src/components/ImportExportBar.tsx:73 */
<AlertDialog open onOpenChange={(open) => !open && setFeedback(null)}>
```

Call sites that unmount them: `LinkTile.tsx:88` and `:90`,
`DashboardTabs.tsx:68` and `:70`, `App.tsx:65` and `:68`,
`ImportExportBar.tsx:72`.

### Target

Each wrapper owns its own `open` state, initialised to `true` on mount (so the
entrance is unchanged). Closing sets it to `false`; the parent's `onClose` is
deferred to `onOpenChangeComplete`, which fires after the closing animation
finishes. **No call site changes.**

`src/components/EditDialog.tsx` — full target body:

```tsx
import { useState } from 'react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { FieldGroup } from './ui/field'

interface EditDialogProps {
  title: string
  onSave: () => Promise<boolean | void> | boolean | void
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ title, onSave, onClose, children }: EditDialogProps) {
  // The dialog owns its open state so Base UI can run the closing animation;
  // the parent only unmounts once that animation has finished.
  const [open, setOpen] = useState(true)

  async function handleSave() {
    const result = await onSave()
    if (result !== false) setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false)
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <FieldGroup>{children}</FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

`src/components/ConfirmDialog.tsx` — full target body:

```tsx
import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from './ui/alert-dialog'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [open, setOpen] = useState(true)
  // Confirming deletes the entity that renders this dialog, so the outcome has
  // to wait until the closing animation has finished or it cuts itself short.
  const outcome = useRef<'confirm' | 'cancel'>('cancel')

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false)
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (nextOpen) return
        if (outcome.current === 'confirm') onConfirm()
        else onCancel()
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogTitle className="sr-only">Confirm delete</AlertDialogTitle>
        <AlertDialogDescription className="text-foreground">{message}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              outcome.current = 'confirm'
              setOpen(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Two details that must not be dropped:

- `AlertDialogCancel` loses its `onClick={onCancel}`. It renders Base UI's
  `Close`, which flips the root's open state; the cancel outcome now runs from
  `onOpenChangeComplete` (the ref's default). Leaving the old handler would fire
  the callback immediately, before the animation.
- `AlertDialogAction` must close the dialog itself — Base UI's does **not**
  auto-close the way Radix's did.

### Steps

1. Replace `src/components/EditDialog.tsx` with the target body above.
2. Replace `src/components/ConfirmDialog.tsx` with the target body above.
3. `src/components/ShortcutsDialog.tsx` — same pattern: add
   `import { useState } from 'react'`, add
   `const [open, setOpen] = useState(true)`, and change line 7 to:
   ```tsx
   <Dialog
     open={open}
     onOpenChange={(nextOpen) => {
       if (!nextOpen) setOpen(false)
     }}
     onOpenChangeComplete={(nextOpen) => {
       if (!nextOpen) onClose()
     }}
   >
   ```
   The `DialogContent` close button already closes via the root; no change.
4. `src/components/ImportExportBar.tsx` — extract the feedback dialog into a
   local component above `ImportExportBar` in the same file:
   ```tsx
   function FeedbackDialog({
     title,
     message,
     onClose,
   }: {
     title: string
     message: string
     onClose: () => void
   }) {
     const [open, setOpen] = useState(true)

     return (
       <AlertDialog
         open={open}
         onOpenChange={(nextOpen) => {
           if (!nextOpen) setOpen(false)
         }}
         onOpenChangeComplete={(nextOpen) => {
           if (!nextOpen) onClose()
         }}
       >
         <AlertDialogContent size="sm">
           <AlertDialogTitle>{title}</AlertDialogTitle>
           <AlertDialogDescription>{message}</AlertDialogDescription>
           <AlertDialogFooter>
             <AlertDialogAction onClick={() => setOpen(false)}>OK</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     )
   }
   ```
   Then replace the inline block at lines 72–82 with:
   ```tsx
   {feedback && (
     <FeedbackDialog
       title={feedback.title}
       message={feedback.message}
       onClose={() => setFeedback(null)}
     />
   )}
   ```
5. Leave every call site unchanged. Their existing `setX(false)` calls inside
   `onConfirm`/`onCancel` now run after the animation and remain the safety net
   if a delete fails while the owning component is still mounted.

### Boundaries

- Do NOT change the conditional-mount pattern (`{editing && <…/>}`) at any call
  site — the whole design exists so call sites stay as they are.
- Do NOT make `ConfirmDialog`'s confirm path `async` or await the delete.
- Do NOT touch `LinkEditModal.tsx` / `DashboardEditModal.tsx`; they compose
  `EditDialog` and need no changes.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.
- Watch `src/components/LinkEditModal.test.tsx:74` and `:89`, which assert
  `onClose` fires after Save — that now routes through `onOpenChangeComplete`.
  Expected to still pass (see the handoff table: Base UI invokes the callback
  immediately when `getAnimations` is absent, as in jsdom). If they hang or fail,
  set `globalThis.BASE_UI_ANIMATIONS_DISABLED = true` in `src/test/setup.ts`
  rather than reverting the source change.

### Browser test

Setup as above. Open the Animations panel at **10% playback** for steps 1–3;
this phase is invisible at full speed if it half-works.

1. **Cancel path** — **⋯ → Edit** on Tile 01, then click **Cancel**. The dialog
   *and* the backdrop blur must both fade out. Neither may disappear in one
   frame.
2. **Escape and backdrop** — reopen the dialog, press `Esc`. Reopen again, click
   outside it. Both must animate out the same way.
3. **Save path** — reopen, change the title to "Tile 01 edited", click **Save**.
   The dialog animates out and the tile's badge shows the new title.
4. **Delete a link** (the important one) — **⋯ → Delete** on Tile 03 → confirm.
   Order matters: the dialog animates out **first**, then the tile disappears.
   Then verify the link is actually gone — the outcome now runs after the
   animation, so a broken deferral would silently drop the delete.
5. **Cancel a delete** — start a delete on Tile 04 and click **Cancel**; it
   animates out and Tile 04 is still there.
6. **Delete a dashboard** — on the **Backgrounds** tab, **⋯ → Delete** → confirm.
   The dialog animates out, then the tab disappears. Re-import the fixture
   afterwards.
7. **Feedback dialog** — **⋯** (top right) → **Import**, choose any non-JSON
   file (e.g. this plan's `.md`). The error dialog appears; press **OK** and it
   animates out.
8. **Shortcuts overlay** — press `?`, then `Esc`. It animates out.

**Pass**: nothing in the app disappears without an exit animation, and all four
outcomes (save, cancel, delete, dismiss) still do what they say. **Fail**: any
dialog snaps away, or an action stops taking effect.

**Done when**: all eight paths above animate out and still perform their action.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 3 — `prefers-reduced-motion` support

**Severity**: MEDIUM · **Category**: Accessibility

### Problem

`grep -rn "prefers-reduced-motion" src` returns **zero hits**. Nothing honours
the OS setting, while real movement runs on: `zoom-in-95` / `zoom-out-95` and
`slide-in-from-*-2` on dialogs, dropdowns, and tooltips; `active:scale-[0.96]` on
every `Button` (`ui/button.tsx:7`); and the tile press feedback added in Phase 4.

### Target

Reduced motion means *fewer and gentler* animations, **not zero** — opacity fades
stay so state changes remain legible; only movement is dropped. `tw-animate-css`
composes its keyframes from custom properties, so zeroing those removes the
movement while `fade-in-0` / `fade-out-0` still run.

```css
/* src/index.css — appended at the end of the file */
@media (prefers-reduced-motion: reduce) {
  /* tw-animate-css composes `enter`/`exit` from these properties, so zeroing
     them strips the movement out of every popup animation while the opacity
     fades still run. They are registered with `inherits: false`, so they have
     to be set on each element rather than inherited from a root rule. */
  *,
  *::before,
  *::after {
    --tw-enter-blur: 0 !important;
    --tw-enter-rotate: 0 !important;
    --tw-enter-scale: 1 !important;
    --tw-enter-translate-x: 0 !important;
    --tw-enter-translate-y: 0 !important;
    --tw-exit-blur: 0 !important;
    --tw-exit-rotate: 0 !important;
    --tw-exit-scale: 1 !important;
    --tw-exit-translate-x: 0 !important;
    --tw-exit-translate-y: 0 !important;
    /* Tailwind v4 press feedback uses the standalone `scale` property, not
       `transform`; dnd-kit's drag transform is deliberately left alone. */
    scale: 1 !important;
  }
}
```

### Steps

1. `src/index.css` — append the block above at the end of the file, after the
   `@layer base { … }` block.

### Boundaries

- Do NOT add blanket `transition: none` / `animation: none` rules. Killing all
  motion is the failure mode this phase exists to avoid.
- Do NOT neutralise `transform` — dnd-kit positions dragged tiles with it
  (`LinkTile.tsx:35`), and a user-driven drag must keep tracking the pointer
  under reduced motion.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.

### Browser test

Setup as above, then turn on **Rendering → Emulate CSS
`prefers-reduced-motion: reduce`**.

1. **Dropdown** — open a tile's **⋯** menu: it fades in with **no** scale-up and
   **no** slide.
2. **Dialog** — open **⋯ → Edit** and close it: fades both ways, no zoom, and the
   Phase 2 exit still plays.
3. **Button press** — press and hold **Save** or **Cancel**: the color/background
   feedback remains, the scale-down does not.
4. **Drag** — drag Tile 02 to a new position: it still follows the pointer and
   the reorder still commits. This is the one thing that must **not** be
   flattened.
5. **Tooltips** — hover the top-bar **+**: fades, no scale.
6. **Turn the emulation off** and repeat steps 1–3: every animation returns.

**Pass**: with reduced motion on, nothing scales, slides, or rotates, everything
still fades, and dragging is unaffected. **Fail**: any element still zooms, or
feedback disappears entirely (a blank, motionless UI is a failure, not a success).

**Done when**: both states behave as described and the toggle is fully
reversible.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 4 — Press feedback on link tiles and the add tile

**Severity**: MEDIUM · **Category**: Physicality, Cohesion

### Problem

The link tile is the app's primary click target and has no press feedback at all
— only a hover shadow:

```tsx
/* src/components/LinkTile.tsx:51 */
className="flex flex-col items-center justify-end overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/10 transition-shadow group-hover:shadow-xl dark:ring-white/10"
```

Every `Button` presses with `active:scale-[0.96]` (`ui/button.tsx:7`) and the add
tile uses a third, unrelated gesture:

```tsx
/* src/components/DashboardGrid.tsx:31 */
className="flex aspect-video w-56 items-center justify-center rounded-2xl border-2 border-dashed border-border text-3xl text-muted-foreground transition-colors hover:border-ring hover:text-foreground active:translate-y-px"
```

Three press languages in one grid.

### Target

One language: a subtle scale-down inside the 0.95–0.98 band, at 150ms (inside the
100–160ms press band) on `ease-out-strong`.

The scale goes on the **inner `AspectRatio`**, never the outer wrapper `div`,
because the wrapper carries dnd-kit's inline `transform` (`LinkTile.tsx:34-38`).

```tsx
/* src/components/LinkTile.tsx:51 — target */
className="flex flex-col items-center justify-end overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/10 transition-[box-shadow,scale] duration-150 ease-out-strong group-hover:shadow-xl active:scale-[0.98] dark:ring-white/10"
```

```tsx
/* src/components/DashboardGrid.tsx:31 — target */
className="flex aspect-video w-56 items-center justify-center rounded-2xl border-2 border-dashed border-border text-3xl text-muted-foreground transition-[color,border-color,scale] duration-150 ease-out-strong hover:border-ring hover:text-foreground active:scale-[0.98]"
```

### Steps

1. `src/components/LinkTile.tsx:51` — replace `transition-shadow` with
   `transition-[box-shadow,scale] duration-150 ease-out-strong` and add
   `active:scale-[0.98]` before the `dark:` class.
2. `src/components/DashboardGrid.tsx:31` — replace `transition-colors` with
   `transition-[color,border-color,scale] duration-150 ease-out-strong` and
   replace `active:translate-y-px` with `active:scale-[0.98]`.

### Boundaries

- Do NOT put the scale on `LinkTile.tsx:47`'s wrapper `div` — that is the dnd-kit
  drag node.
- Do NOT change `ui/button.tsx`; `0.96` is already in band.
- Do NOT add hover lift/translate to the tile in this phase.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.

### Browser test

Setup as above, on **Motion QA**. Drag is the risk here, and per `AGENTS.md` this
class of bug is invisible to typecheck, lint, and tests.

1. **Press** — press and hold Tile 01 without moving the pointer: it scales down
   slightly; release and it springs back. Then click it properly — it still
   navigates to `example.com/01`. Come back.
2. **Press-and-drag** — press Tile 01, drag past the 8px threshold, and drop it
   between Tile 05 and Tile 06. Two things to confirm: the tile does **not** stay
   squashed after the drop, and the drag does **not** navigate.
3. **Reorder across rows** — drag Tile 12 up to the first position, then drag
   Tile 02 down to the last. Track them **by title, not position**. Nothing may
   fly off-screen or land in the wrong slot.
4. **Cross-dashboard drag** — drag Tile 07 onto the **Backgrounds** tab. It
   should move there (check the Backgrounds tab now has 4 tiles).
5. **Add tile** — press the dashed **+** tile at the end of the grid: it scales
   like the others, with no vertical nudge, and opens the edit dialog for a new
   link. Delete that link afterwards.
6. **Slow-motion** — at 10% playback, press a tile and confirm the press
   decelerates into place rather than snapping back linearly.
7. Re-import the fixture to restore the original layout.

**Pass**: tiles, the add tile, and buttons all press the same way, and every drag
behavior from before still works. **Fail**: any tile stuck at 0.98 after a drag,
any navigation on drop, or any reorder landing wrong.

**Done when**: the press language is uniform and drag/reorder/move behavior is
unchanged.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 5 — `transition-all` and drop-target ring timing

**Severity**: LOW · **Category**: Performance, Easing & duration

### Problem

```tsx
/* src/components/ui/tabs.tsx:59 */
"... text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full ..."
```

`transition-all` animates every animatable property off the GPU. Today the tab
trigger only changes color and background, so the real cost is small — but it
silently extends to any layout property added later.

```tsx
/* src/components/DashboardTabs.tsx:35 */
className={`group relative rounded-full transition-shadow ${isOver ? 'ring-2 ring-ring' : ''}`}
```

The drag-over drop ring transitions on Tailwind's defaults — 150ms on
`cubic-bezier(0.4, 0, 0.2, 1)`, an ease-in ramp. Drag feedback should be the
snappiest motion in the app.

### Target

```tsx
/* src/components/ui/tabs.tsx:59 — target */
"... whitespace-nowrap text-foreground/60 transition-[color,background-color,box-shadow] group-data-vertical/tabs:w-full ..."
```

```tsx
/* src/components/DashboardTabs.tsx:35 — target */
className={`group relative rounded-full transition-shadow duration-100 ease-out-strong ${isOver ? 'ring-2 ring-ring' : ''}`}
```

### Steps

1. `src/components/ui/tabs.tsx:59` — replace the single token `transition-all`
   with `transition-[color,background-color,box-shadow]`.
2. `src/components/DashboardTabs.tsx:35` — add `duration-100 ease-out-strong`
   after `transition-shadow`.

### Boundaries

- Do NOT touch `ui/tabs.tsx:62`'s `after:transition-opacity` — the `line` variant
  is unused here and correct as written.
- Do NOT change the tab's focus-visible ring classes.
- Do NOT change how `isOver` is computed, or the `ring-2 ring-ring` values.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.
- `grep -rn "transition-all" src` — must return nothing.

### Browser test

Setup as above.

1. **Tabs** — hover across the three dashboard tabs, then click between them.
   Color and background still transition; nothing shifts, resizes, or jitters.
   Tab-key to a tab and confirm the focus ring still appears.
2. **Drop ring** — start dragging Tile 01 and hover it over the **Backgrounds**
   tab. The ring should appear almost immediately and clear just as fast when you
   move away. Drop it to confirm the move still works.
3. **⌥ badges sanity check** — hold ⌥. The digit badges must appear instantly on
   the first three tabs, with no fade and no shift in the tab strip's layout.
   (Nothing in this phase should have touched them; this is the regression
   check.)
4. Re-import the fixture.

**Pass**: tab hover is unchanged, the drop ring feels immediate, ⌥ badges are
still instant. **Fail**: any lag on the ring, or badges that now fade.

**Done when**: no `transition-all` remains in `src/` and the drop ring reacts at
100ms.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 6 — Fade link background images in on load

**Category**: Missed opportunity (jarring state change)

### Problem

The tile renders its background as a CSS `background-image` and mounts a hidden
`<img>` purely to detect load failure:

```tsx
/* src/components/LinkTile.tsx:40-44 */
const backgroundStyle = {
  backgroundImage: showImage ? `url(${link.backgroundImageUrl})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

/* src/components/LinkTile.tsx:53-60 */
{showImage && (
  <img src={link.backgroundImageUrl} alt="" className="hidden" onError={() => setImageFailed(true)} />
)}
```

On a fresh tab — which is *every* load of this app — each tile snaps from grey
`bg-muted` to its full image the instant that request lands, at a different
moment per tile. The result is a scatter of pops across the grid.

### Target

Promote the `<img>` to a real, positioned layer that fades in over 200ms once it
has decoded. The grey `bg-muted` stays as the underlying surface, so a failed
image still falls back silently (a PRD requirement) and `onError` is preserved.

The `complete` check in the ref is load-bearing: for an image already in the HTTP
cache, `load` can fire before React attaches `onLoad`, which would strand the tile
at `opacity-0` forever.

```tsx
/* src/components/LinkTile.tsx — target */
const [imageLoaded, setImageLoaded] = useState(false)

// backgroundStyle is deleted entirely.

<AspectRatio
  ratio={16 / 9}
  className="flex flex-col items-center justify-end overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/10 transition-[box-shadow,scale] duration-150 ease-out-strong group-hover:shadow-xl active:scale-[0.98] dark:ring-white/10"
>
  {showImage && (
    <img
      ref={(node) => {
        // A cached image can finish loading before React attaches onLoad.
        if (node?.complete) setImageLoaded(true)
      }}
      src={link.backgroundImageUrl}
      alt=""
      draggable={false}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out-strong ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageFailed(true)}
    />
  )}
  …
```

`AspectRatio` is already `relative` (`ui/aspect-ratio.tsx:18`), and dropping the
`style` prop also sidesteps the documented `--ratio` clobbering gotcha entirely.

### Steps

1. `src/components/LinkTile.tsx` — add
   `const [imageLoaded, setImageLoaded] = useState(false)` next to the existing
   `imageFailed` state (line 18).
2. Delete the `backgroundStyle` object (lines 40–44) and remove
   `style={backgroundStyle}` from the `AspectRatio` (line 50).
3. Replace the hidden `<img>` (lines 53–60) with the positioned, fading `<img>`
   above.
4. Confirm the `<a>` overlay (lines 62–68) still follows the image in source
   order so it stays above it; both are positioned and the anchor comes later, so
   no `z-index` is needed.

### Boundaries

- Do NOT change the `imageFailed` fallback or the `showImage` condition — silent
  fallback to a neutral surface is a PRD requirement.
- Do NOT add a skeleton, shimmer, or placeholder blur.
- Do NOT touch the dashboard background in `DashboardGrid.tsx:17-18`. It changes
  on dashboard switch, which is keyboard-frequent and must stay unanimated.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.

### Browser test

Setup as above, on **Motion QA**.

1. **Cold load** — Network tab → **Slow 4G** + **Disable cache** checked →
   hard-reload (`⌘⇧R`). Each tile shows grey, then its image fades in. No hard
   pop, and the three "(no image)" tiles simply stay grey.
2. **Warm cache** (the regression that matters) — uncheck *Disable cache*, turn
   throttling off, reload normally. Images must appear **immediately**. A tile
   that stays blank means the `node.complete` check regressed — that's a hard
   fail, not a cosmetic one.
3. **Broken image** — "Tile 05 (broken image)" points at a 404. It must stay
   grey with no broken-image icon and no flash.
4. **Live edit** — **⋯ → Edit** on Tile 03, paste
   `https://picsum.photos/seed/manual/640/360` into *Background image URL*, Save.
   The image fades in on the tile.
5. **Clear it** — edit Tile 03 again, empty the background field, Save. It goes
   back to grey.
6. **Interaction intact** — click a tile (navigates), drag one (reorders).
7. **Dashboard background** — switch to **Backgrounds**. The dashboard's own
   background image should still appear the way it always did — instantly, with
   no fade. That path is deliberately untouched.

**Pass**: images fade in cold, appear instantly when cached, broken URLs stay
silent, and clicking/dragging is unaffected. **Fail**: any permanently blank tile.

**Done when**: all seven checks hold.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 7 — Empty-state entrance

**Category**: Missed opportunity (rare, high-emotion moment)

### Problem

The first-run welcome card appears with no motion at all:

```tsx
/* src/components/EmptyState.tsx:8 */
<Empty className="w-80 flex-none border bg-card/90">
```

This is the app's one genuinely rare first-impression moment and it spends none of
the delight budget it is allowed.

### Target

A short fade with a 4px rise — `slide-in-from-bottom-1` is one spacing unit
(0.25rem), small enough to read as settling rather than sliding.

```tsx
/* src/components/EmptyState.tsx:8 — target */
<Empty className="w-80 flex-none border bg-card/90 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-strong">
```

Per the decision table, this replays on every mount, including ⌥-switching to an
empty dashboard. That was accepted deliberately. Phase 3's reduced-motion block
already strips the rise and leaves the fade.

### Steps

1. `src/components/EmptyState.tsx:8` — append
   `animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-strong` to
   the `Empty` className.

### Boundaries

- Do NOT add state, refs, or a "first render" flag — animating on every mount is
  the chosen design.
- Do NOT animate the "Add link" button inside the card separately, and do not add
  a stagger. One element, one entrance.
- Do NOT animate the grid or its tiles (that is Phase 8's fenced scope).

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`.

### Browser test

Setup as above.

1. **Switch to the Empty dashboard** — the welcome card fades and rises into
   place. Nothing around it shifts while it does.
2. **Replay** — switch to **Motion QA** and back to **Empty** a few times. It
   replays cleanly, with no flicker or double-animation.
3. **Keyboard path** — press **⌥3** to reach Empty. Confirm the tab switch itself
   is still instant (only the card animates) — if the whole grid or the
   background animates, something outside this phase's scope has changed.
4. **Real transition to empty** — on Empty, click **Add link**, save the
   placeholder, then delete that link. The card returns with its entrance.
5. **Reduced motion** — with the emulation on, the card fades but does not rise.
6. **Slow-motion** — at 10% playback, confirm the rise is small (a settle, not a
   slide) and the card never overshoots.

**Pass**: the card enters with a subtle fade + rise; the tab switch around it
stays instant. **Fail**: layout jumping while it animates, or any motion applied
to the tab strip or grid.

**Done when**: all six checks hold.

### ⏸ PAUSE — report and wait for approval.

---

## Phase 8 — View Transitions for delete reflow (fenced)

**Category**: Missed opportunity · **This phase is revertible by design.**

### Problem

Deleting a link makes every tile after it teleport into its new position. The
usual fix — animating the grid — is exactly what `TECHNICAL_DESIGN.md` documents
three separate position bugs in. The View Transitions API sidesteps that
machinery: the browser snapshots before and after and animates the difference
itself, with dnd-kit's transform math uninvolved.

### Target

**Delete only.** Adding a link is out of scope — a new tile appends at the end and
displaces only the add tile, which is not the jarring case.

1. **A stable name per tile.** `src/components/LinkTile.tsx` — add
   `viewTransitionName` to the existing wrapper `style` object (lines 34–38),
   which already carries dnd-kit's transform:
   ```tsx
   const style = {
     transform: CSS.Translate.toString(transform),
     transition,
     opacity: isDragging ? 0.5 : 1,
     viewTransitionName: `link-${link.id}`,
   }
   ```
   Ids come from `crypto.randomUUID()` (`lib/id.ts`), so `link-<uuid>` is always
   a valid custom-ident and never starts with a digit.

2. **A synchronous DOM update inside the transition.** `deleteLink` currently
   removes the document and waits for the RxDB subscription to push new state
   (`AppStateContext.tsx:234-238`) — too late for `startViewTransition` to
   capture the "after" state. Apply the removal to local state synchronously
   first, the same optimistic pattern `reorderLinks` already uses and documents
   at `AppStateContext.tsx:255-260`:
   ```tsx
   async function deleteLink(id: string) {
     if (!db) return

     // startViewTransition captures the post-update DOM when its callback
     // returns, so the removal has to be applied to local state synchronously;
     // the RxDB write below is reconciled by the subscription (linksEqual makes
     // the matching re-emission a no-op).
     const removeLocally = () => {
       flushSync(() => setLinks((prev) => prev.filter((link) => link.id !== id)))
     }

     if (canAnimateViewTransition()) {
       document.startViewTransition(removeLocally)
     } else {
       removeLocally()
     }

     const doc = await db.links.findOne(id).exec()
     await doc?.remove()
   }
   ```
   with `import { flushSync } from 'react-dom'` and, near the other module-scope
   helpers in that file:
   ```tsx
   function canAnimateViewTransition() {
     return (
       typeof document.startViewTransition === 'function' &&
       !window.matchMedia('(prefers-reduced-motion: reduce)').matches
     )
   }
   ```

3. **The transition's own timing.** `src/index.css`, appended after Phase 3's
   reduced-motion block:
   ```css
   ::view-transition-group(*) {
     animation-duration: 200ms;
     animation-timing-function: var(--ease-in-out-strong);
   }

   ::view-transition-old(*) {
     animation-duration: 150ms;
     animation-timing-function: var(--ease-out-strong);
   }
   ```
   `--ease-in-out-strong` is correct for the surviving tiles because they are
   *moving on screen*; the removed tile is *exiting*, so it gets
   `--ease-out-strong`. No reduced-motion guard is needed in CSS — the JS check
   skips the transition entirely in that case.

### Steps

1. `src/components/LinkTile.tsx` — add `viewTransitionName` to the `style` object.
2. `src/context/AppStateContext.tsx` — add the `flushSync` import, the
   `canAnimateViewTransition` helper, and the new `deleteLink` body.
3. `src/index.css` — append the two `::view-transition-*` rules.
4. If TypeScript does not know `document.startViewTransition`, do **not** add a
   dependency or a global `.d.ts` — narrow at the call site with the existing
   `typeof … === 'function'` check plus a local cast inside that one helper.

### Boundaries

- Do NOT wrap `addLink`, `updateLink`, `reorderLinks`, `moveLinkToDashboard`,
  `deleteDashboard`, or dashboard switching in a view transition.
- Do NOT change `reorderLinks`' optimistic-update-then-single-`bulkUpsert`
  structure.
- Do NOT remove the `linksEqual` guard at `AppStateContext.tsx:79`; the
  optimistic removal depends on it.
- Do NOT add a polyfill for non-Chromium browsers — falling through to today's
  instant behavior is the intended fallback.

### Verify (mechanical)

- `yarn lint && yarn tsc -b && yarn test`. The characterization tests in
  `src/context/AppStateContext.test.tsx` must pass unchanged: jsdom has no
  `document.startViewTransition`, so the helper returns `false` and the code takes
  the plain path.

### Browser test

Setup as above, on **Motion QA** (12 tiles across rows), in **Chrome**. This
phase is browser-verified or it does not land.

1. **Middle-of-grid delete** — delete "Tile 06" (**⋯ → Delete** → confirm). The
   tiles after it glide into place over ~200ms rather than jumping. Watch tiles
   by **title**, not by position.
2. **Cross-row reflow** — re-import the fixture, then delete "Tile 02" so the
   reflow pulls tiles up from the second row into the first.
3. **Rapid deletes** — delete two tiles in quick succession. No tile may be left
   stranded, doubled, or mid-transition.
4. **Drag regression (the real risk)** — re-import, then drag-reorder several
   tiles across different distances and directions: short moves within a row,
   long moves across rows, first↔last. Drop each and confirm final positions by
   title. Then delete one tile. **If the drag settle regresses at all — a tile
   flying off-screen, a wrong landing slot — revert this phase.**
5. **Delete right after a drag** — reorder a tile, and immediately delete a
   different one without waiting.
6. **Reduced motion** — with the emulation on, deleting is instant with no
   transition.
7. **Empty transition** — delete every tile on the **Backgrounds** dashboard; the
   last delete hands over to the empty-state card from Phase 7 without a visual
   collision.
8. Re-import the fixture.

**Pass**: deletes reflow smoothly, drag/reorder is identical to Phase 7, reduced
motion skips it. **Fail**: any drag regression at all.

**Done when**: all eight checks hold.
**If it fails**: revert this phase only — phases 1–7 stand alone and do not
depend on it.

### ⏸ PAUSE — report.

---

## Considered and rejected

Recorded so a later reader does not re-open them:

| Item | Why rejected |
|------|--------------|
| Animating dashboard switching / a grid + background crossfade | Keyboard-initiated and high-frequency (⌥1–⌥0, ⌥←/⌥→, ⌥[/⌥]). Animation here is a regression. |
| Animating the held-⌥ digit badges (`DashboardTabs.tsx:47-55`) | Same reason; they must appear and vanish the instant ⌥ is pressed and released. |
| `transform-origin: center` on dialogs | Modals appear centered — center origin is correct and explicitly exempt. |
| `zoom-in-95` / `zoom-out-95` values | Already correct. Nothing in this repo uses `scale(0)`. |
| `origin-(--transform-origin)` on dropdown/tooltip | Already correct — both scale from their trigger. |
| `active:scale-[0.96]` and 150ms timing on `Button` | Already inside the 0.95–0.98 and 100–160ms bands. |
| `LinkTile`'s `animateLayoutChanges` opt-out (`LinkTile.tsx:13-14`) | A deliberate, documented fix for the settle-after-drop bug. |
| Tile entrance animation on add | Would replay on every dashboard switch unless gated with extra state; low payoff. Phase 8 covers the jarring half — delete. |

## Maintenance notes

- After this plan lands, `docs/TECHNICAL_DESIGN.md` needs two updates: **Stack**
  should record the motion tokens (`--ease-out-strong`, `--ease-in-out-strong` in
  `src/index.css`) as the source of truth for easing, and **Known Gotchas** should
  gain the Phase 2 lifecycle rule — *a dialog that is conditionally mounted by its
  parent must own its `open` state and defer the parent's `onClose` to
  `onOpenChangeComplete`, or its exit animation never plays*. If Phase 8 lands,
  note the optimistic-removal requirement in `deleteLink` alongside the existing
  `reorderLinks` note.
- Per `AGENTS.md`, delete this file **and `docs/plans/fixtures/`** in the commit
  that lands the final phase.
