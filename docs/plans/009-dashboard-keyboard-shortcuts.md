# Plan 009: Keyboard shortcuts for dashboard switching (and friends)

> **Executor instructions**: This is a **phased** plan with a **mandatory
> pause after every phase**. Complete one phase, run its verification, update
> this file's Phase Status table, then **stop and report to the operator**. Do
> not begin the next phase until the operator says to continue. If anything in
> a phase's "STOP conditions" section occurs, stop and report — do not
> improvise.
>
> **Browser verification is the operator's job.** Do not start a dev server,
> drive Playwright, or take screenshots proactively. Each phase lists what the
> operator should click/press; hand that list over at the pause.
>
> **Do not commit.** The operator commits their own work, per-phase.
>
> **Drift check (run first)**:
> `git diff --stat c9838dc..HEAD -- src/App.tsx src/components/DashboardTabs.tsx src/components/DashboardGrid.tsx src/components/LinkTile.tsx src/context/AppStateContext.tsx src/context/app-state-context.ts package.json`
> Empty output expected. Any structural drift from the excerpts quoted below
> is a STOP.

## Status

- **Priority**: P2 (feature, not a defect)
- **Effort**: M
- **Risk**: LOW–MEDIUM (Phase 3 changes existing PRD-described behavior)
- **Depends on**: nothing
- **Category**: feature
- **Planned at**: commit `c9838dc`, 2026-07-27

## Phase status

Update this table at the end of each phase, before pausing.

| Phase | Title | Status |
|-------|-------|--------|
| 1 | hotkeys-js foundations + ⌥1–⌥9 dashboard switching | DONE |
| 2 | ⌥← / ⌥→ / ⌥[ / ⌥] cycling with wrap | DONE |
| 3 | ⌥N adds a link and opens its edit dialog (also for the `+` tile) | DONE |
| 4 | Digit badges revealed while ⌥ is held | DONE |
| 5 | `?` keyboard-shortcuts help overlay | DONE |
| 6 | Docs (`PRD.md`, `TECHNICAL_DESIGN.md`) + final verification | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (one-line reason)

## Why this matters

Launch Tabs is a new-tab page — it is opened dozens of times a day and every
interaction today requires the mouse. Numbered shortcuts make dashboard
switching a single chord, which is the app's most frequent action.

## Decisions already made (do not re-litigate)

Settled with the maintainer during planning on 2026-07-27:

| Decision | Choice | Notes |
|---|---|---|
| **Library** | **[`hotkeys-js`](https://github.com/jaywcjlove/hotkeys-js)** (v4.0.4, MIT, zero deps, ~4 kB gzipped, bundles its own `.d.ts`) | Maintainer's explicit choice. All key *binding* goes through it; see "How hotkeys-js shapes this design" below. |
| Modifier | **Alt / macOS Option (⌥)** | Not bare digits (edit dialogs have inputs); not Cmd/Ctrl (Chrome reserves those). hotkeys-js spells it `alt` or `option` — they're the same keyCode (18). |
| Range | **⌥1 – ⌥9, ⌥0 → dashboard positions 1–10** | Amended 2026-07-27 (mid-implementation, after Phase 4): ⌥0 now maps to the 10th dashboard. An 11th+ dashboard has no shortcut. No "⌥9 = last" Chrome-ism. |
| Cycling | **⌥← / ⌥→ *and* ⌥[ / ⌥]**, both pairs | Wraps around at both ends. |
| New link | **⌥N adds a link** to the active dashboard — *not* a new dashboard | The maintainer was explicit: "option+N for new shortcut, not for a new dashboard". "Shortcut" here means a link tile. |
| After create | **The new link's edit dialog opens immediately**, for ⌥N *and* for the existing `+` tile / empty-state "Add link" button | Deliberate change to current `+` behavior so the two paths stay identical. Requires a `docs/PRD.md` update. |
| Discovery | **Digit badges appear on the tabs while ⌥ is held**, and disappear on release | Nothing visible at rest. |
| Help | **`?` opens a shortcuts overlay** listing everything | |
| Labels | Platform-aware: `⌥3` on macOS, `Alt+3` elsewhere | |

Explicitly **not** in scope: user-remappable bindings, numpad digits,
a shortcut for creating a *dashboard*, a shortcut for deleting anything,
`react-hotkeys-hook` or any other wrapper library.

## How hotkeys-js shapes this design

All of the following was **verified against the v4.0.4 dist source**, not
assumed. It replaces guards this plan would otherwise have hand-rolled, and it
introduces two constraints of its own.

**What it gives us for free**

1. **Key names resolve to legacy `keyCode`, not `event.key`.** `code(x)` is
   `_keyMap[x] || _modifier[x] || x.toUpperCase().charCodeAt(0)`, and dispatch
   reads `event.keyCode`. That sidesteps the macOS problem entirely: Option+1
   emits the character `¡` and ⌥[ emits `“`, but `event.keyCode` stays 49 /
   219 regardless of the modifier. `_keyMap` contains `'['`→219, `']'`→221,
   `'/'`→191, `left/arrowleft`→37, `right/arrowright`→39; digits fall through
   to `charCodeAt` (`'1'`→49 … `'9'`→57). **Every binding this plan needs
   resolves correctly.**
2. **Exact chord matching.** Dispatch compares
   `_downKeysCurrent.sort().join('') === _downKeys.sort().join('')`, so
   `alt+1` fires *only* when Alt and `1` are the keys held — ⌥⌘1 and
   Ctrl+⌥+1 do not match. The "ignore when ctrl/meta is also down" guard is
   free.
3. **A default input filter.** `hotkeys.filter` blocks events whose target is
   `contenteditable`, a non-readonly `TEXTAREA`/`SELECT`, or a text-ish
   `INPUT` (checkbox/radio/button/etc. are excluded from the block). So
   "don't fire while typing in an edit dialog" is free.
4. **`capture` and `element` options**, so we can register in the capture
   phase (needed — see constraint 2 below).

**Constraints it introduces**

1. **It is a module-level singleton with global state.** One handler registry
   (`_handlers`), one `hotkeys.filter`, one `_downKeys` array shared by the
   whole page. Consequences: the filter override is set **once** at module
   scope, not per-hook; and **every test must unbind in cleanup**
   (`afterEach(() => hotkeys.unbind())`) or handlers leak between test files.
2. **`capture` is latched per element, by whichever binding registers
   first.** `elementEventMap.has(element)` short-circuits listener
   registration, so a later `hotkeys(..., {capture: true}, ...)` on the same
   `document` silently inherits the first binding's capture flag. **Every
   binding in this codebase must pass `{ capture: true }`** — mixed values are
   a latent bug, not a compile error.
3. **It never calls `preventDefault`/`stopPropagation` for us.** Our handlers
   must do it, and only when they actually act.
4. **It does not check `event.repeat`.** Holding ⌥1 auto-repeats the handler.
   We add that check in the filter override.
5. **It has no blur reset that we can observe.** It clears its internal
   `_downKeys` on window **focus** (not blur) and emits no event, so it cannot
   drive the Phase 4 badge state on blur — that phase adds native listeners on
   top.

## Current state (verified at `c9838dc`)

- **No keyboard handling exists anywhere in `src/`.** `grep -rn
  "keydown\|onKeyDown\|altKey" src/` returns nothing, and `hotkeys-js` is not
  yet a dependency. This feature introduces both.
- `src/context/AppStateContext.tsx:64-69` — the dashboards subscription
  queries `.find({ sort: [{ order: 'asc' }] })`, so **`dashboards` from
  context is already in displayed tab order**; array index `n` is tab
  position `n + 1`. No re-sorting needed anywhere in this plan.
- `src/components/DashboardTabs.tsx:57-85` — `<Tabs value={activeDashboardId
  ?? ''} onValueChange={setActiveDashboardId}>` wrapping one
  `DashboardTabItem` per dashboard plus the `+` button. `DashboardTabItem`
  renders a `TabsTrigger` inside a `useDroppable` wrapper `div` that already
  has `relative`.
- `src/context/app-state-context.ts:21` — `addLink: (dashboardId: string) =>
  Promise<void>` (returns nothing today).
- `src/context/AppStateContext.tsx:201-213` — `addLink` inserts
  `{ id: generateId(), dashboardId, order, title: 'New link', url:
  'https://example.com' }` and returns nothing.
- `src/App.tsx:9-55` — the `Dashboard` component holds `useAppState()`,
  renders `<Navbar/>` + `<DashboardGrid onAddLink={() =>
  void addLink(activeDashboard.id)} />` inside `DndContext`. This is the
  mount point for the shortcut hook.
- `src/components/DashboardGrid.tsx` — receives `onAddLink` and wires it to
  both the trailing `+` button and `EmptyState`.
- `src/components/LinkTile.tsx:19,88` — each tile owns its own `editing`
  state and conditionally renders `<LinkEditModal link={link} onClose={...}/>`.
  `LinkEditModal` takes `{ link, onClose }` and is mounted conditionally
  (it has no `open` prop).
- `src/hooks/useLinkDragAndDrop.ts:16-25` — the existing precedent for a
  window-level **capture-phase** listener in this codebase, and the reason
  Phase 2 below insists on capture.
- `src/components/ui/` has `dialog`, `badge`, `button`, `tooltip`,
  `separator` — everything Phases 4/5 need. **No `kbd` primitive exists**;
  Phase 5 defines its own small inline element rather than generating one.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Add dep   | `yarn add hotkeys-js` | resolves 4.x        |
| Tests     | `yarn test`         | all pass            |
| Typecheck | `yarn tsc -b`       | exit 0              |
| Lint      | `yarn lint`         | exit 0              |

Run the last three at the end of every phase — per `AGENTS.md`, none of them
catches what the others do.

## Cross-cutting implementation rules

Get these right once in Phase 1; every later phase depends on them.

1. **Every binding goes through hotkeys-js**, with `{ capture: true }`, no
   exceptions (see constraint 2 above). Never add a raw `keydown` listener
   for a *shortcut*. (Phase 4's modifier-held tracking is not a shortcut and
   is explicitly allowed native `blur`/`visibilitychange` listeners.)
2. **Handlers call `event.preventDefault()` and `event.stopPropagation()`
   only when they actually act** — never unconditionally. `stopPropagation`
   in the capture phase is what keeps Base UI's `Tabs.List` roving focus from
   also reacting to ⌥←/⌥→; a blanket stop would break dialog Escape handling.
3. **Bind once on mount.** The hook keeps a `useRef` of the latest
   callbacks/values, updated on every render, and registers its bindings in a
   `useEffect` with `[]` deps, unbinding its own handlers on cleanup
   (`hotkeys.unbind('alt+n', handler)` — pass the handler so sibling bindings
   survive). This avoids bind/unbind churn on every state change and avoids
   re-latching the capture flag.
4. **The filter override lives at module scope in `src/lib/keyboard.ts`** and
   wraps — not replaces — the library default, so the upstream input-detection
   logic keeps working:

   ```ts
   const defaultFilter = hotkeys.filter
   hotkeys.filter = (event) =>
     defaultFilter(event) && !event.repeat && !isDialogOpen()
   ```

   `isDialogOpen()` is
   `document.querySelector('[role="dialog"],[role="alertdialog"]') !== null`.
   Base UI portals its dialogs to `document.body`, so a plain document query
   is the reliable check.
5. **Read platform at call time, not module load** (`isMac()` as a function),
   so tests can stub `navigator`.

## Phase 1 — hotkeys-js foundations + ⌥1–⌥9 dashboard switching

### Step 1.1 — Add the dependency

`yarn add hotkeys-js` (expect ^4.0.4). It ships `dist/index.d.ts` via its
`exports` map, so **no `@types/*` package and no ambient declaration is
needed**. Confirm `import hotkeys from 'hotkeys-js'` typechecks before
continuing.

### Step 1.2 — `src/lib/keyboard.ts` (new)

Small module; owns the global filter override and the label helpers.

```ts
export const MAX_DASHBOARD_SHORTCUTS = 9

export function isMac(): boolean
// navigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent, case-insensitive 'mac'

export function isDialogOpen(): boolean

export function shortcutLabel(keyLabel: string): string
// isMac() ? `⌥${keyLabel}` : `Alt+${keyLabel}`
```

Plus the module-scope `hotkeys.filter` wrapper from cross-cutting rule 4.
Importing this module is what installs the filter — the hook in Step 1.3
imports it, so ordering takes care of itself. `shortcutLabel` is the single
source of truth for how a binding is written in tooltips and the Phase 5
overlay.

### Step 1.3 — `src/hooks/useKeyboardShortcuts.ts` (new)

```ts
interface KeyboardShortcutsOptions {
  dashboards: Dashboard[]
  setActiveDashboardId: (id: string) => void
}
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void
```

- A `useRef` holding `options`, reassigned on every render (`optionsRef.current
  = options`) so the bound handler always sees fresh values.
- One `useEffect(() => {...}, [])` that binds:

  ```ts
  const DASHBOARD_KEYS = 'alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+7,alt+8,alt+9'

  function handleDashboardKey(event: KeyboardEvent, handler: HotkeysEvent) {
    const position = Number(handler.shortcut.split('+')[1])   // 'alt+3' -> 3
    const target = optionsRef.current.dashboards[position - 1]
    if (!target) return                     // no dashboard there: let the key through
    event.preventDefault()
    event.stopPropagation()
    optionsRef.current.setActiveDashboardId(target.id)
  }

  hotkeys(DASHBOARD_KEYS, { capture: true }, handleDashboardKey)
  return () => hotkeys.unbind(DASHBOARD_KEYS, handleDashboardKey)
  ```

  (`handler.shortcut` is the matched binding string — typed as
  `HotkeysEvent` from `hotkeys-js`. Deriving the digit from it avoids nine
  near-identical closures.)

This hook grows in Phases 2, 3 and 5 — keep each binding its own
`hotkeys(...)` call with its own named handler so cleanup stays per-binding.

### Step 1.4 — Wire it up in `src/App.tsx`

Inside `Dashboard`, after the existing `useAppState()` destructure (add
`setActiveDashboardId` to it):

```ts
useKeyboardShortcuts({ dashboards, setActiveDashboardId })
```

Call it **before** the `if (!ready) return …` early return — hooks must not
be conditional.

### Step 1.5 — `aria-keyshortcuts` on the first nine tabs

In `DashboardTabs.tsx`, pass the zero-based index into `DashboardTabItem`
and set, on the `TabsTrigger`, `aria-keyshortcuts={index <
MAX_DASHBOARD_SHORTCUTS ? \`Alt+${index + 1}\` : undefined}`. (The ARIA
attribute value is spec'd to use `Alt` on every platform — this is the one
place `shortcutLabel` is *not* used.)

### Step 1.6 — Tests

- `src/lib/keyboard.test.ts` (new): `shortcutLabel` on both platforms (stub
  `navigator` with `vi.stubGlobal`, restore after); `isDialogOpen` with and
  without a `[role="dialog"]` element in the document.
- `src/hooks/useKeyboardShortcuts.test.ts` (new): `renderHook` + `fireEvent`.
  **hotkeys-js reads `event.keyCode`, so tests must pass it explicitly**:
  `fireEvent.keyDown(document, { key: '2', code: 'Digit2', keyCode: 50,
  altKey: true })`. Add `afterEach(() => hotkeys.unbind())` (constraint 1).
  Cases:
  1. ⌥2 → setter called with the 2nd dashboard's id.
  2. `2` without alt → not called.
  3. ⌥⌘2 (`altKey` + `metaKey`) → not called (exact-match).
  4. ⌥9 with only 3 dashboards → not called, and `defaultPrevented` stays
     `false`.
  5. Fired with an `<input>` as the event target → not called (library
     filter).
  6. ⌥1 while a `<div role="dialog">` is in the document → not called (our
     filter wrapper).
  7. `{ repeat: true }` → not called.

**Verify**: `yarn test && yarn tsc -b && yarn lint` all green.

**Operator browser check** (report these at the pause):
- ⌥1 / ⌥2 / ⌥3 switch dashboards; the active tab highlight follows.
- ⌥ + a digit past the last dashboard does nothing (no flicker, no error).
- Open a link's Edit dialog, click into the Title field, type `1` — the digit
  types normally and no dashboard switch happens; ⌥1 while that dialog is
  open also does nothing.
- macOS specifically: ⌥1 must **not** insert `¡` anywhere.
- Hold ⌥1 down: the dashboard switches once, and auto-repeat does nothing.

### STOP conditions for Phase 1
- `hotkeys-js` types don't resolve under this TS config (`moduleResolution`
  mismatch with its `exports` map) — report rather than adding a `.d.ts` shim
  or loosening compiler options.
- hotkeys-js handlers don't fire at all under jsdom — report with the exact
  `fireEvent` payload tried; do not switch the tests to `hotkeys.trigger()`,
  which bypasses the dispatch path being tested.
- Any existing test in `AppStateContext.test.tsx` starts failing.

**PAUSE — report and wait.**

## Phase 2 — Cycling with wrap

Extend `useKeyboardShortcuts.ts`. Add `activeDashboardId: string | null` to
the options and pass it from `App.tsx`.

- `hotkeys('alt+left,alt+[', { capture: true }, prev)` and
  `hotkeys('alt+right,alt+]', { capture: true }, next)`.
  (`_keyMap` resolves `left`→37, `right`→39, `[`→219, `]`→221 — all verified.)
- Index math on the already-ordered `dashboards` array, wrapping:
  `(currentIndex + delta + dashboards.length) % dashboards.length`.
- No-ops — return **without** `preventDefault` — when `dashboards.length < 2`
  or the active id isn't found in the array.

**Tests** (add to `useKeyboardShortcuts.test.ts`, with `keyCode: 37/39/219/221`):
next from the last wraps to the first; previous from the first wraps to the
last; both bracket codes behave identically to their arrow counterparts;
single-dashboard case is a no-op.

**Verify**: `yarn test && yarn tsc -b && yarn lint`.

**Operator browser check**:
- ⌥→ steps forward and wraps past the end; ⌥← steps back and wraps.
- ⌥] / ⌥[ do the same.
- **Click a dashboard tab first so it has keyboard focus, then press ⌥→.**
  This is the risky case: Base UI's `Tabs.List` roving focus also listens for
  arrow keys. Expected: the dashboard *switches* and focus does not skip two
  tabs. If it double-steps, `{ capture: true }` isn't in effect on the
  document listener — most likely because some binding registered without it
  first (constraint 2). That's a STOP; report it.
- Bare ← / → with a tab focused must still behave exactly as before (moves
  focus only; Base UI's `activateOnFocus={false}` means it does not switch
  dashboards — see `TECHNICAL_DESIGN.md` Known Gotchas).

**PAUSE — report and wait.**

## Phase 3 — ⌥N adds a link and opens its edit dialog

The most invasive phase: it changes existing behavior the PRD describes.

### Step 3.1 — `addLink` returns the new id

- `src/context/app-state-context.ts`: `addLink: (dashboardId: string) =>
  Promise<string | null>` (`null` only on the existing `if (!db) return`
  guard).
- `src/context/AppStateContext.tsx:201-213`: hoist the generated id into a
  `const`, pass it to `insert`, `return id`. Change nothing else — ordering
  and the placeholder values stay exactly as they are.

### Step 3.2 — Lift "just-created link" editing into `App.tsx`

In `Dashboard`:

```ts
const [editingLinkId, setEditingLinkId] = useState<string | null>(null)

async function handleAddLink() {
  if (!activeDashboardId) return
  const id = await addLink(activeDashboardId)
  if (id) setEditingLinkId(id)
}
```

- Pass `onAddLink={() => void handleAddLink()}` to `DashboardGrid`
  (replacing the current inline `addLink` call) — this covers the `+` tile
  **and** the empty-state button with no change to `DashboardGrid.tsx` or
  `EmptyState.tsx`.
- Render, as a sibling of the layout `div` inside `DndContext`:
  `{editingLink && <LinkEditModal link={editingLink} onClose={() =>
  setEditingLinkId(null)} />}` where `editingLink = links.find((l) => l.id
  === editingLinkId)`. The lookup can be `undefined` for one render while
  RxDB's subscription catches up — that's why it's a conditional render, not
  a non-null assertion.
- `LinkTile`'s own `editing` state stays as-is; the ⋯ → Edit path is
  untouched. The two modals can never both be open.

### Step 3.3 — ⌥N in the shortcut hook

Add an optional `onAddLink?: () => void` to the hook options and bind
`hotkeys('alt+n', { capture: true }, handler)`; `preventDefault()`,
`stopPropagation()`, call it. Pass `handleAddLink` from `App.tsx`.

Note: ⌥N cannot spam links, for two independent reasons — the filter blocks
`event.repeat`, and once the created link's dialog is open `isDialogOpen()`
blocks the next press. Confirm both in the browser check.

### Step 3.4 — Tests

- `useKeyboardShortcuts.test.ts`: ⌥N (`keyCode: 78`) calls `onAddLink`; plain
  `n` does not; ⌥N with a dialog present does not.
- `AppStateContext.test.tsx`: extend the existing `addLink` test to assert
  the returned id matches the inserted document's `id`.

**Verify**: `yarn test && yarn tsc -b && yarn lint`.

**Operator browser check**:
- ⌥N on a populated dashboard: a `New link` tile appears **and** its edit
  dialog opens immediately.
- Cancel that dialog → the placeholder tile remains (intended; it matches how
  `+` behaves today).
- Save it → the tile updates.
- The `+` tile and the empty-state "Add link" button now both open the dialog
  too.
- With the dialog open, ⌥N and ⌥2 do nothing.
- Holding ⌥N down creates exactly one link.
- Drag-and-drop reorder still works normally afterwards (this phase touches
  `App.tsx`, which owns `DndContext`).

### STOP conditions for Phase 3
- `LinkEditModal` turns out to need an `open` prop or a portal parent it
  doesn't get at `App.tsx` level.
- The just-created link is still `undefined` after the dialog would have
  opened (i.e. the modal never appears) — report rather than adding timeouts
  or polling.

**PAUSE — report and wait.**

## Phase 4 — Digit badges while ⌥ is held

This is modifier-*state* tracking, not a shortcut — it is the one place
native listeners are allowed alongside hotkeys-js, because hotkeys-js has no
observable blur reset (constraint 5).

### Step 4.1 — `src/hooks/useAltHeld.ts` (new)

Returns `boolean`. One effect; every listener removed on cleanup.

- **Key state via hotkeys-js**, so the shared filter rules (no inputs, no open
  dialog, no repeat) apply automatically:

  ```ts
  const handler = (event: KeyboardEvent) =>
    setHeld(event.altKey && !event.ctrlKey && !event.metaKey)
  hotkeys('*', { capture: true, keydown: true, keyup: true }, handler)
  ```

  A `'*'` binding fires on every key event in scope, including the Option
  keydown/keyup themselves (verified: dispatch only early-returns on a
  modifier-only press when no `'*'` handler is registered). **Never
  `preventDefault` in this handler.**
- **Reset via native listeners** — `blur` on `window`,
  `visibilitychange` on `document`, `contextmenu` on `window`, each setting
  `false` unconditionally. Not optional: on Windows/Linux, holding Alt focuses
  the browser menu bar and the `keyup` never reaches the page, which would
  strand the badges on screen forever.
- Cleanup must call `hotkeys.unbind('*', handler)` as well as removing the
  native listeners.

### Step 4.2 — Render the badges in `DashboardTabs.tsx`

- Call `useAltHeld()` once in `DashboardTabs` (not per tab) and pass the
  boolean down to `DashboardTabItem` alongside the index from Step 1.5.
- Show a digit for `index < MAX_DASHBOARD_SHORTCUTS` only.
- **Hard constraint: the badge must not reflow the tab strip.** Position it
  absolutely over the tab (the wrapper `div` at `DashboardTabs.tsx:22`
  already has `relative`), e.g. top-left, `pointer-events-none`, small and
  high-contrast. Do not add padding to `TabsTrigger` when it appears, and do
  not put it in the flex flow.
- Mark it `aria-hidden` — `aria-keyshortcuts` from Step 1.5 already carries
  this to assistive tech.
- The existing `TabsTrigger` has `pr-6` reserving room for the options button
  on the right; keep the badge on the left so the two never collide.

Per `TECHNICAL_DESIGN.md`'s "stylistic changes belong in `ui/`" rule: if the
badge ends up being a restyled `Badge`, add a variant to
`src/components/ui/badge.tsx` rather than piling one-off classes into
`DashboardTabs.tsx`.

### Step 4.3 — Tests

`src/hooks/useAltHeld.test.ts` (with `afterEach(() => hotkeys.unbind())`):
alt keydown → `true`; keyup with `altKey: false` → `false`; `window` blur
while held → `false`; keydown targeting an `<input>` → stays `false`.

**Verify**: `yarn test && yarn tsc -b && yarn lint`.

**Operator browser check**:
- Hold ⌥: digits appear on the first ten tabs (1–9, then 0 on the 10th);
  **nothing shifts position** (watch the `+` button and the tab widths).
- Release ⌥: digits disappear.
- Hold ⌥, switch to another app / another browser tab, come back: no
  stranded digits.
- Hold ⌥ and right-click: no stranded digits.
- With 11+ dashboards, the 11th onward show no digit.
- Hovering a tab while ⌥ is held still reveals the ⋯ options button, and the
  badge doesn't overlap it.
- ⌥1 still switches dashboards (i.e. the `'*'` binding didn't swallow it).
- ⌥0 switches to the 10th dashboard (added 2026-07-27, after this phase was
  originally completed — see "Decisions already made").

**PAUSE — report and wait.**

## Phase 5 — `?` shortcuts help overlay

### Step 5.1 — `src/lib/shortcuts.ts` (new)

A single exported array describing every binding, consumed by the overlay
(and available to anything later):

```ts
export interface ShortcutDescription { keys: string; description: string }
export const SHORTCUTS: ShortcutDescription[]
```

Built with `shortcutLabel` so it reads `⌥1` / `Alt+1` per platform. Entries:
`1…9` → "Switch to dashboard 1–9"; `←` / `→` and `[` / `]` → "Previous /
next dashboard (wraps)"; `N` → "Add a link to the current dashboard"; plus a
final unmodified `?` → "Show this help".

### Step 5.2 — `src/components/ShortcutsDialog.tsx` (new)

`{ onClose }`, mounted conditionally like the other modals in this codebase.
Built on `src/components/ui/dialog.tsx` (`Dialog`, `DialogContent`,
`DialogHeader`, `DialogTitle`), a two-column list from `SHORTCUTS`. Each
row's `keys` is an array (`ShortcutDescription.keys: string[]`), one chip per
alternative key combo, rendered as a `KbdGroup` of individual `Kbd` chips
(both from `src/components/ui/kbd.tsx`, added by the maintainer mid-phase,
2026-07-27 — supersedes the original plan of a single inline `<kbd>`-style
span per row). Escape / outside click / the close button all dismiss.

### Step 5.3 — Trigger

Bind `hotkeys('shift+/', { capture: true }, handler)` in
`useKeyboardShortcuts` behind a new `onShowHelp?: () => void` option. `?` is
Shift+`/` (keyCode 191) on a US layout; hotkeys-js resolves `'/'` from
`_keyMap`, so this is a normal binding, not a special case. The existing
filter still applies, so `?` inside a text field types normally and `?` while
the overlay is open does nothing.

Layout caveat to note in the code comment: on layouts where `?` is not
Shift+`/`, this binding won't match. Accepted — the overlay is a convenience,
and every other binding is layout-independent.

`App.tsx` owns a `showShortcuts` boolean and renders `<ShortcutsDialog/>`.

**Verify**: `yarn test && yarn tsc -b && yarn lint`. Add hook tests: `shift+/`
(`keyCode: 191, shiftKey: true`) calls `onShowHelp`; the same from an input
does not.

**Operator browser check**:
- `?` opens the overlay; Escape and the close button dismiss it.
- Every listed binding matches what actually works, with macOS ⌥ glyphs.
- `?` typed inside the Title field of a link's edit dialog types a `?`.

**PAUSE — report and wait.**

## Phase 6 — Docs and final verification

### `docs/PRD.md`
1. New top-level **"Keyboard shortcuts"** section (place it after "Links",
   before "Backgrounds"): the ⌥1–9 mapping to *displayed* tab order, cycling
   with wrap, ⌥N, `?`, the held-⌥ badge affordance, and the rule that
   shortcuts are inert while a dialog is open or a text field is focused.
   State that positions past the ninth have no shortcut.
2. **"Creating links"**: the placeholder link's edit dialog now opens
   immediately, from all three entry points (`+` tile, empty-state button,
   ⌥N); dismissing it leaves the placeholder link in place.
3. **"Shared UI Patterns" → tooltips bullet**: note that shortcut hints are
   platform-aware (⌥ on macOS, Alt elsewhere).
4. **"Explicitly Out of Scope"**: shortcuts are not user-remappable.

### `docs/TECHNICAL_DESIGN.md`
1. **Stack**: add "**Keyboard shortcuts**: `hotkeys-js` (v4, MIT, zero
   dependencies)" with a one-line rationale — key-name → `keyCode`
   resolution, exact chord matching, and a built-in form-input filter.
2. **Project Structure**: add `src/lib/keyboard.ts`, `src/lib/shortcuts.ts`,
   `src/hooks/useKeyboardShortcuts.ts`, `src/hooks/useAltHeld.ts`,
   `src/components/ShortcutsDialog.tsx`.
3. **Key Interaction Implementation Notes**: a "Keyboard shortcuts" bullet —
   bindings registered in `App.tsx` via a single hook, `{ capture: true }`
   everywhere, the wrapped `hotkeys.filter`, and the fact that `dashboards`
   arrives pre-sorted by `order` so index == tab position.
4. **Known Gotchas**: three new entries —
   - hotkeys-js latches its `capture` flag on the first binding per element,
     so **every** binding must pass `{ capture: true }`; capture is what stops
     Base UI's roving tab focus from also consuming ⌥←/⌥→.
   - hotkeys-js is a module-level singleton (one filter, one registry), so
     tests must `hotkeys.unbind()` in `afterEach` or handlers leak across
     files.
   - Holding Alt on Windows/Linux focuses the browser menu bar and swallows
     `keyup`; hotkeys-js only resets its pressed-keys state on window *focus*
     and emits no event, so `useAltHeld` adds native `blur`/`visibilitychange`
     resets.
5. **Testing Focus**: add the new suites; note that badge rendering and the
   Base-UI-focus interaction remain browser-verified only.

### Final verification
`yarn test && yarn tsc -b && yarn lint`, then `git status` to confirm only
in-scope files changed, then update this file's Phase Status table to DONE
and hand back a summary of what is uncommitted.

**PAUSE — report and wait.**

## Scope

**In scope** (the only files to modify/create):
- Create: `src/lib/keyboard.ts`, `src/lib/keyboard.test.ts`,
  `src/lib/shortcuts.ts`, `src/hooks/useKeyboardShortcuts.ts`,
  `src/hooks/useKeyboardShortcuts.test.ts`, `src/hooks/useAltHeld.ts`,
  `src/hooks/useAltHeld.test.ts`, `src/components/ShortcutsDialog.tsx`
- Modify: `package.json`, `yarn.lock`, `src/App.tsx`,
  `src/components/DashboardTabs.tsx`, `src/context/app-state-context.ts`,
  `src/context/AppStateContext.tsx`, `src/context/AppStateContext.test.tsx`,
  `docs/PRD.md`, `docs/TECHNICAL_DESIGN.md`, this file
- Possibly modify (Phase 4 only, if the badge earns a variant):
  `src/components/ui/badge.tsx`
- `src/components/ui/kbd.tsx` — added by the maintainer outside this plan's
  file list (2026-07-27); `ShortcutsDialog.tsx` consumes it as-is, unmodified.

**Out of scope** (do NOT touch):
- `src/hooks/useLinkDragAndDrop.ts`, `src/components/LinkTile.tsx`,
  `src/components/DashboardGrid.tsx`, `src/components/EmptyState.tsx` —
  Phase 3 is designed specifically to avoid changing these.
- `src/storage/`, RxDB schemas, export/import — no data model change; a
  shortcut is derived from `order`, never stored.
- Remappable/user-configurable bindings, numpad digits, a
  create-dashboard shortcut, `react-hotkeys-hook`.
- Any dev-server or Playwright run (operator's job).

## Git workflow

- Branch: `feature/009-dashboard-keyboard-shortcuts`
- **Do not commit, push, or open a PR.** The operator commits per-phase.
- At each pause, list the files changed in that phase.

## Done criteria

- [ ] All six phases DONE in the Phase Status table, each with an operator
      sign-off at its pause
- [ ] `yarn test`, `yarn tsc -b`, `yarn lint` all exit 0
- [ ] Every shortcut is registered through hotkeys-js with `{ capture: true }`;
      `grep -rn "addEventListener('keydown'" src/` returns nothing
- [ ] ⌥1–⌥9 switch to displayed tab positions 1–9; higher positions no-op
- [ ] ⌥←/⌥→/⌥[/⌥] cycle with wrap, without double-stepping when a tab has
      focus
- [ ] ⌥N adds a link and opens its edit dialog; `+` and the empty state do
      the same
- [ ] Digit badges appear only while ⌥ is held, never reflow the tab strip,
      and never strand after a window blur
- [ ] `?` opens an accurate, platform-labeled shortcuts overlay
- [ ] No shortcut fires while a text field is focused, a dialog is open, or a
      key is auto-repeating
- [ ] `docs/PRD.md` and `docs/TECHNICAL_DESIGN.md` reflect the new behavior
- [ ] `git status` shows no files outside the in-scope list

## Maintenance notes

- `SHORTCUTS` in `src/lib/shortcuts.ts` is the human-readable list only; the
  `hotkeys(...)` calls in `useKeyboardShortcuts.ts` are the real binding
  table. Adding a binding means touching both — keep them adjacent in review.
- hotkeys-js's global singleton state is the thing most likely to bite later:
  one `hotkeys.filter` for the whole app, one registry, and a `capture` flag
  latched by whichever binding registers first.
- ⌥0 → 10th dashboard was added mid-implementation (2026-07-27, after Phase 4);
  `MAX_DASHBOARD_SHORTCUTS` is now 10 and `dashboardShortcutDigit()` in
  `src/lib/keyboard.ts` maps tab index → displayed digit (0 for the 10th).
  Phase 5's `SHORTCUTS` list and Phase 6 docs must describe 1–9 *and* 0, not
  just 1–9.
- Deferred deliberately: an 11th+ slot, numpad digits (hotkeys-js supports
  `num_1`…`num_9` if ever wanted), remappable bindings.
- A discoverability affordance for `?` was added mid-implementation
  (2026-07-27, after Phase 5): a small non-interactive bottom-left footer
  hint in `App.tsx` (`Kbd` showing `?` + "for shortcuts" text), styled like
  the existing bottom-right copyright footer (`fixed`, `pointer-events-none`,
  `text-white/70`) but with the `Kbd` chip given its own dark/white override
  so it stays legible over an arbitrary dashboard background image, matching
  `Badge`'s `overlay` variant treatment for the same reason.
- If a future dashboard-reordering feature lands, shortcuts follow `order`
  automatically — no extra work, but re-check the badge indices.

## Handoff — session context (2026-07-27)

Written by Claude Opus 5 in a planning session with the maintainer. Details
worth carrying forward that aren't reconstructable from the repo:

**Repo conventions**
- Plans live at **`docs/plans/NNN-kebab-slug.md`** (see `AGENTS.md`), and a
  plan file is **deleted in the commit that lands its work**. Plans 001–008
  lived in a root-level `plans/` directory and were removed that way in
  `daf2dee` ("Execute plans 001-007"); 008 was rejected, so 009 is the next
  free number. The directory moved to `docs/plans/` on 2026-07-27, at the
  maintainer's request, right after this plan was written.
- Plan format to match: `git show daf2dee^:plans/006-url-validation-ux.md`
  is the closest reference (drift check, Status block, Current state with
  verified code excerpts, Scope in/out, Steps with per-step Verify, Done
  criteria, STOP conditions, Maintenance notes).

**Maintainer working preferences (confirmed)**
- **Never commit** unless they say "commit" in the moment. They commit
  per-component/per-phase themselves. At a wrap-up, list what's uncommitted.
- **They verify UI in the browser themselves** — do not proactively run
  Playwright or a dev server. This is why every phase here ends with an
  operator checklist instead of an automated browser step. Note this
  contradicts nothing in `AGENTS.md` ("verify UI changes in an actual
  browser") — the verification still happens, the maintainer just performs it.
- Update the plan file after each phase before moving on.
- They review batched suggestions individually and expect only some to
  survive — a phase partially rolled back is normal, not a failure signal.

**Interview answers, verbatim where they matter**
- On ⌥N: *"option+N for new shortcut, not for a new dashboard"* — "shortcut"
  = a link tile. They picked the option that also changes the `+` tile to open
  the edit dialog, knowing it requires a PRD update.
- They corrected the modifier's name mid-interview to **Option** (macOS is
  their platform), which is why every user-facing label is platform-aware.
- Range: firmly 1–9, no ⌥0, no Chrome-style "⌥9 = last".
- Cycling: both arrows and brackets, wrapping.
- **hotkeys-js was specified after the first draft was written.** The original
  plan hand-rolled a capture-phase `window` listener keyed off `event.code`;
  that whole approach was replaced. Do not reintroduce raw `keydown`
  listeners for shortcuts.

**Library research (verified against the v4.0.4 dist, not from memory)**
- `code(x) = _keyMap[x] || _modifier[x] || x.toUpperCase().charCodeAt(0)`,
  and dispatch reads `event.keyCode` — which is why the macOS "Option+1 emits
  `¡`" problem doesn't apply. `_keyMap` has `'['`→219, `']'`→221, `'/'`→191,
  `left`→37, `right`→39; digits resolve via `charCodeAt` to 49–57.
- Chord matching is **exact**
  (`_downKeysCurrent.sort().join('') === _downKeys.sort().join('')`), so
  ⌥⌘1 does not trigger `alt+1`. No manual ctrl/meta guard needed.
- The default `hotkeys.filter` already blocks contenteditable, `TEXTAREA`,
  `SELECT`, and text-ish `INPUT` targets. It does **not** check
  `event.repeat`, and it knows nothing about open dialogs — hence the wrapper.
- `capture` is stored per element in `elementEventMap` and only read on first
  registration for that element. Mixed `capture` values across bindings are a
  silent bug.
- The library resets `_downKeys` on window **focus**, never on blur, and emits
  no event either way — so it cannot drive React state for the ⌥-held badges
  on blur.
- npm metadata at planning time: `hotkeys-js@4.0.4`, MIT, no runtime
  dependencies, `exports` map with `types: ./dist/index.d.ts` (so no
  `@types/*` package). `HotkeysEvent` and `KeyHandler` are exported types.

**Technical findings verified against `c9838dc`**
- `dashboards` from context is pre-sorted by `order` (RxDB query-level sort at
  `AppStateContext.tsx:65`) → array index == tab position. This is the single
  most load-bearing fact in the plan.
- Zero existing keyboard handling in `src/`.
- `addLink` currently returns `Promise<void>`; Phase 3 needs the new id, and
  returning it is the smallest change that lets `App.tsx` own create-then-edit
  without touching `DashboardGrid`/`EmptyState`/`LinkTile`.
- Base UI `Tabs.List` uses manual activation (`activateOnFocus={false}`,
  documented in `TECHNICAL_DESIGN.md` Known Gotchas) — bare arrow keys move
  focus without switching. The ⌥ variants must switch *and* not double-step,
  which is what the capture-phase requirement protects.

**Open questions never asked** (decide with the maintainer if they come up):
whether the overlay needs a visible entry point, and whether ⌥⇧N or similar
should create a *dashboard* later.
