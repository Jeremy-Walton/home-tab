# Launch Tabs — Technical Design

Companion to [PRD.md](./PRD.md) and [DATA_FORMATS.md](./DATA_FORMATS.md).
Captures the concrete stack and architecture decisions for implementing
the PRD.

## Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Package manager**: yarn 4 (Corepack; see `packageManager` in
  `package.json`)
- **State management**: React Context + custom hooks (no Redux/Zustand) —
  thin wrappers around the storage layer described below
- **Local data store / storage abstraction**: RxDB (IndexedDB-backed via
  the Dexie storage adapter)
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Keyboard shortcuts**: [`hotkeys-js`](https://github.com/jaywcjlove/hotkeys-js)
  (v4, MIT, zero dependencies) — chosen because it resolves key names to
  legacy `keyCode` rather than `event.key` (sidesteps platform-specific
  character remapping, e.g. macOS Option+digit), does exact chord matching
  (so `alt+1` doesn't also fire on `alt+cmd+1`), and ships a default filter
  that already ignores form-input targets.
- **Styling**: Tailwind CSS v4. Motion tokens (`--ease-out-strong`,
  `--ease-in-out-strong`) are defined in a plain `@theme { }` block in
  `src/index.css` (not the existing `@theme inline` block, which doesn't
  emit custom properties to `:root`) and are the source of truth for easing
  across popups, dialogs, and press feedback — don't invent a new curve
  inline. The two enter/exit *tempos* are likewise tokenized, as the
  `motion-dialog` and `motion-popup` `@utility` rules next to that block;
  every `src/components/ui/` popup wears one of the two rather than
  spelling out its own `duration-*` pair.
- **UI component layer**: [shadcn/ui](https://ui.shadcn.com) (`base-luma`
  style/preset) generating thin wrappers in `src/components/ui/`, built on
  **Base UI** (`@base-ui/react`) primitives — not Radix UI; this project
  migrated off Radix (see "Known Gotchas"). `class-variance-authority` for
  variant props, `tailwind-merge`/`clsx` (via the `cn()` helper) for class
  composition, Phosphor (`@phosphor-icons/react`) for icons.
- **Icons**: static glyphs come from `@phosphor-icons/react`; every icon on an
  interactive control is instead an animated Phosphor equivalent vendored from
  [phosphor-animated](https://phosphor-animated.com) — shadcn registry items
  (`npx shadcn@latest add "https://phosphor-animated.com/r/<name>.json"`) that
  land in `src/components/icons/` as ordinary, editable project files. They are
  the only reason [`motion`](https://motion.dev) (Framer Motion's successor) is
  a dependency; it is the sole JS animation library here, everything else is
  CSS. It is deliberately not imported whole — see "Known Gotchas" for the
  `m` + `LazyMotion` split and what silently undoes it. `@phosphor-icons/react` stays installed: `ui/dropdown-menu.tsx` still
  uses `CheckIcon`, and future `shadcn add` runs generate imports from it.
- **Fonts**: self-hosted variable fonts via `@fontsource-variable`
  (Space Grotesk for body/sans, Figtree for headings).
- **Routing**: none — single root component, dashboard switching is a
  state change, not a navigation.
- **Testing**: Vitest (+ jsdom, React Testing Library installed and
  configured) — see "Testing Focus" for what's actually covered today.
- **Lint**: [oxlint](https://oxc.rs/docs/guide/usage/linter.html), configured
  in `.oxlintrc.json` (`correctness` as errors, `suspicious` as warnings, plus
  the `typescript`/`react`/`react-hooks`/`oxc` plugins). It replaced the
  ESLint stack; `react/react-in-jsx-scope` is off because the project uses the
  automatic JSX runtime, and `react/only-export-components` is off for the
  registry-generated `src/components/ui/**` and `src/components/icons/**`.
  Non-type-checked, as the ESLint config before it was — oxlint's type-aware
  mode (`options.typeAware` + `oxlint-tsgolint`) is deliberately not enabled,
  since it would reintroduce a TypeScript-version coupling.
- **Format**: [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html),
  configured in `.oxfmtrc.json`. It runs on **oxfmt's defaults with no style
  overrides** — semicolons, double quotes, 100 columns, 2-space indent,
  trailing commas. The repo briefly kept `semi: false`/`singleQuote: true` to
  preserve its old hand-maintained style; those were dropped so the config is
  nothing but scope, and so generated output (`shadcn add`, code samples)
  lands already-formatted instead of being restyled on the way in. Import
  order is **formatter-enforced** (`sortImports: true`): external packages,
  then `@/`-aliased internals, then relative paths, alphabetical within each
  group and separated by a blank line. `sortSideEffects` stays off (its
  default), which is what keeps bare imports — `./index.css` in `main.tsx`,
  `../lib/keyboard` in the two keyboard hooks — from being reordered across
  the imports they depend on. `sortTailwindcss` is still **off**, as its own
  whole-repo diff. `sortPackageJson` is on by default, so
  `package.json`'s key order is formatter-owned and a `yarn add` can leave
  `format:check` red until `yarn format` runs. Scope is `src/`,
  `vite.config.ts`, and the root JSON configs — `docs/**`, `.github/**`, and
  all Markdown are excluded via `ignorePatterns` and stay hand-managed. The
  version is pinned exactly (no caret) so a patch release can't silently
  reformat the tree in CI.
- **`git blame` and the reformat commits**: the whole-repo reformats live in
  their own commits, listed in `.git-blame-ignore-revs`. GitHub honours that
  file automatically; a local clone needs
  `git config blame.ignoreRevsFile .git-blame-ignore-revs` once.
- **Hosting**: GitHub Pages, deployed under the repository's default
  project-pages path (`https://<user>.github.io/home-tab/`, per `base:
  '/home-tab/'` in `vite.config.ts`). **No custom domain is configured at
  this time** (no `CNAME`), unlike earlier plans — see "Open Items."
- **CI/CD**: GitHub Actions
  - `ci.yml` — runs `yarn lint`, `yarn format:check`, `yarn tsc -b`,
    `yarn test` on push to `main` and on every pull request.
  - `deploy.yml` — runs `yarn lint`, `yarn format:check`, `yarn test`, then
    `yarn build` → deploys `dist/` to GitHub Pages on push to `main`.

## Why RxDB

RxDB was chosen over a hand-rolled `load()/save()` storage interface
because it already solves "local-first now, real backend later" as a
first-class feature:

- Local persistence via IndexedDB (Dexie adapter) ships today, with no
  backend.
- When a backend is introduced, RxDB has official replication plugins
  (CouchDB, GraphQL, Firestore, Supabase, REST, WebRTC) — sync can likely
  be added by configuring a plugin rather than writing a custom protocol.
- Mature, widely adopted (~22k GitHub stars), actively maintained, with
  commercial support available if ever needed. Core is Apache 2.0; a few
  advanced plugins are paid, but everything needed for v1 (local storage +
  basic replication) is free.

This replaces the originally-planned coarse `load()/save()` storage
abstraction — RxDB's collections/queries *are* the abstraction layer.

## Data Model

Two RxDB collections, replacing the single-blob `AppState` approach:

### `dashboards` collection

| field        | type              | notes                                  |
|--------------|-------------------|-----------------------------------------|
| `id`         | string (primary)  |                                          |
| `name`       | string            | e.g. "Default"; fully renamable         |
| `order`      | number            | determines tab position; new dashboards append to the end |
| `backgroundImageUrl` | string (optional) | per-dashboard background       |
| `createdAt`  | number            |                                          |

### `links` collection

| field             | type             | notes                                   |
|-------------------|------------------|------------------------------------------|
| `id`              | string (primary) |                                           |
| `dashboardId`     | string           | FK to `dashboards.id`; indexed            |
| `order`           | number           | determines position within dashboard      |
| `title`           | string           |                                            |
| `url`             | string           | scheme auto-prepended (`https://`) if missing |
| `backgroundImageUrl` | string (optional) |                                       |

### App-level state (active dashboard)

The currently active dashboard id is persisted as a plain `localStorage`
key (`launch-tabs:activeDashboardId`, see `AppStateContext.tsx`) rather
than an RxDB collection, since it's a single value with no query needs.

### Why two collections instead of one with embedded links

- Moving a link between dashboards is a single-field update
  (`dashboardId`), not array surgery on a parent document.
- Reordering is an `order` field update on one document, not a full
  array rewrite.
- Maps cleanly onto a relational/document backend later if a replication
  plugin is introduced.

### Schema versioning

Two distinct version concepts, kept separate:

- **RxDB collection schema version** (`src/storage/schemas.ts`): both
  `dashboards` and `links` are currently `version: 0`. Any future change to
  either schema (add/remove/retype a field) must bump that collection's
  `version` and ship a `migrationStrategies` entry for the step (RxDB runs
  migrations automatically against a user's existing IndexedDB data the
  first time they open the app after the upgrade). No migration strategy
  exists yet because no schema change has happened yet — define one before
  the first schema change ships, not after.
- **Export file format version** (`CURRENT_EXPORT_VERSION` in
  `src/lib/importExport.ts`, currently `1`): versions the *exported JSON
  file* shape, independent of the RxDB schemas above. See
  `docs/DATA_FORMATS.md`'s "Versioning note" for the read/write contract.

## Project Structure

- `src/types/index.ts` — `Dashboard`, `Link`, `LegacyState`,
  `ExportedState` types (see `docs/DATA_FORMATS.md` for the wire shapes).
- `src/storage/` — `schemas.ts` (RxDB schemas), `db.ts` (database/
  collection setup, Dexie storage adapter).
- `src/context/` — `AppStateContext.tsx` (the `AppStateProvider`: owns the
  RxDB subscriptions, bootstrap/legacy-import effect, and every mutation:
  `addDashboard`, `updateDashboard`, `deleteDashboard`, `addLink`,
  `updateLink`, `deleteLink`, `reorderLinks`, `moveLinkToDashboard`,
  `exportState`, `importState`), `useAppState.ts` (consumer hook),
  `app-state-context.ts` (the context object + value type, split out for
  fast-refresh compatibility).
- `src/hooks/useLinkDragAndDrop.ts` — dnd-kit sensor setup, the
  drag-vs-click suppression listener (see "Known Gotchas"), and
  `handleDragEnd`'s branch between "dropped on a dashboard tab" (move) vs.
  "dropped on another tile" (reorder).
- `src/hooks/useKeyboardShortcuts.ts` — the single hook that registers every
  `hotkeys-js` binding (dashboard switching, cycling, ⌥N, `?`); see "Keyboard
  shortcuts" below.
- `src/hooks/useAltHeld.ts` — tracks whether ⌥ is currently held, driving the
  tab-strip digit badges in `DashboardTabs.tsx`.
- `src/hooks/useClosingDialog.ts` — the shared dialog close lifecycle (local
  `open` state + deferring the parent's callback to `onOpenChangeComplete`)
  used by every dialog in the app; see "Known Gotchas".
- `src/lib/` — `id.ts` (`generateId`, currently `crypto.randomUUID()`),
  `url.ts` (`normalizeUrl`), `importExport.ts` (format detection +
  legacy-mapping, see `docs/DATA_FORMATS.md`), `dashboardDropId.ts` (encodes/
  decodes the synthetic droppable id used for the "drop a tile on a
  dashboard tab" gesture), `utils.ts` (the shadcn `cn()` class helper),
  `keyboard.ts` (`isMac`, `isDialogOpen`, `shortcutLabel`,
  `dashboardShortcutDigit`, and the module-scope `hotkeys.filter` override),
  `shortcuts.ts` (`SHORTCUTS`, the human-readable list backing
  `ShortcutsDialog`).
- `src/App.tsx` — root component: `DndContext` + layout shell; owns
  `useKeyboardShortcuts`, the just-created-link edit-dialog state, and the
  `?`-triggered `ShortcutsDialog`.
- `src/components/` — one file per app-specific component:
  `Navbar.tsx`, `DashboardTabs.tsx` (tab strip + per-tab options menu +
  held-⌥ digit badges), `DashboardGrid.tsx` (grid/empty-state switch +
  sortable context), `LinkTile.tsx`, `EmptyState.tsx`, `OptionsMenu.tsx` (the
  shared options trigger: a tooltip'd dropdown-menu button drawn as a
  horizontal three-dot glyph; callers pass the menu items as children), `EntityOptionsMenu.tsx` (`OptionsMenu` +
  the Edit/Move/Delete item set used by both dashboards and links),
  `ConfirmDialog.tsx` (shared delete-confirmation), `EditDialog.tsx`
  (shared edit-modal shell), `LinkEditModal.tsx`/`DashboardEditModal.tsx`
  (field sets on top of `EditDialog`), `ShortcutsDialog.tsx` (the `?`
  overlay, rendering `SHORTCUTS`), `ImportExportBar.tsx`,
  `LogoIcon.tsx`/`Wordmark.tsx` (branding).
- `src/components/icons/` — `animated-icon.tsx` (the phosphor-animated runtime:
  weight resolution, triggers, reduced-motion handling) plus one file per icon
  (`plus`, `x`, `caret-right`, `dots-three`), each a `GEOMETRY` object and a
  `Choreography` keyframe object fed to `createAnimatedIcon`. Both are plain
  data — these are editable project code, not vendor files, so retuning a
  keyframe in place is expected rather than a fork. Alongside them,
  `HoverIcon.tsx` — the project-owned wrapper every call site actually uses; see
  "Known Gotchas" for what it exists to solve. `motion-features.ts` is the
  lazily-imported Motion feature bundle, kept in its own module purely so it
  becomes its own async chunk.
- `src/components/ui/` — shadcn-generated primitive wrappers (`button`,
  `dialog`, `alert-dialog`, `dropdown-menu`, `tabs`, `tooltip`, `badge`,
  `aspect-ratio`, `label`, `separator`, `field`, `input`, `empty`, `kbd`).
  These are owned project code, not off-limits vendor files. Two rules govern
  what goes where: **stylistic changes belong here** — bake a recurring
  look into the primitive itself (a CVA `variant`/`size`, or an adjusted
  default class), even if it's only used in one place today (e.g. the
  `overlay` badge variant, or the enlarged hit-area baked into the
  `icon-xs`/`icon-sm` button sizes). **Composition belongs outside `ui/`**
  — opinionated assemblies of these primitives (`EditDialog`,
  `ConfirmDialog`, `OptionsMenu`, `EntityOptionsMenu`) live in
  `src/components/`.

## Key Interaction Implementation Notes

- **Reordering** (drag-and-drop within a dashboard): `@dnd-kit/core`
  sortable list; on drop, recompute and persist `order` values for
  affected links in the `links` collection.
- **Moving to another dashboard**: either via the tile's options menu
  "Move to…" submenu, or by dragging a tile onto an entry in the dashboard
  tab strip (`@dnd-kit` supports cross-container drag targets via
  `useDroppable`; see `dashboardDropId.ts`). Both paths update
  `dashboardId` and set `order` to `max(order in target) + 1`.
- **Deleting a dashboard**: cascade-delete all `links` documents where
  `dashboardId` matches, after user confirms. Blocked entirely if it's
  the only remaining dashboard (UI disables the delete action).
- **Deleting a link**: requires confirmation, then a single document
  delete.
- **Broken image fallback**: handled at the component level via an
  `onError` handler on the `<img>`/background element, falling back to a
  default background color rather than showing a broken-image icon.
- **URL normalization**: a small utility run on save — if the string
  doesn't start with a recognized scheme, prepend `https://`.
- **Keyboard shortcuts**: all bindings are registered by one hook,
  `useKeyboardShortcuts.ts`, mounted once in `App.tsx`. Every binding passes
  `{ capture: true }` — `hotkeys-js` latches its capture flag on the first
  binding registered per element, so a mixed setting would silently break
  capture for the others (see "Known Gotchas"). A module-scope
  `hotkeys.filter` override in `keyboard.ts` wraps — not replaces — the
  library default, adding "ignore auto-repeat" and "ignore while a dialog is
  open" on top of the library's own "ignore form-input targets." Dashboard
  digit shortcuts don't map onto `dashboards` by any stored field — they
  reuse the fact that `AppStateContext`'s dashboards query is already sorted
  by `order` (see "Data Model"), so array index *is* tab position; the same
  fact drives the held-⌥ digit badges in `DashboardTabs.tsx`.

## Export / Import

Exact JSON shapes, field mappings, and the format-detection heuristic are
in `docs/DATA_FORMATS.md` — this is the implementation summary:

- **Export**: `AppStateContext.tsx`'s `exportState()` serializes the
  current `dashboards`/`links` state (plus active-dashboard id) via
  `lib/importExport.ts`'s `serializeState`; `ImportExportBar.tsx` turns
  that into a downloaded `launch-tabs-export.json`.
- **Import (current format)**: `importState()` bulk-upserts the parsed
  `dashboards`/`links` arrays into their RxDB collections by `id`
  (existing local records are overwritten if their `id` matches; nothing
  local is deleted).
- **Import (legacy format)**: `lib/importExport.ts`'s `isLegacyState` /
  `mapLegacyState` detect and convert the old shape, used both by manual
  import and by the automatic bootstrap path below.
- **Import (legacy format, automatic)**: the bootstrap effect in
  `AppStateContext.tsx` checks `localStorage.getItem('state')` on every
  load, *independent of how many dashboards already exist* — a user may
  have opened the app once before (creating an empty "Default") and only
  later end up with legacy data in `localStorage` (e.g. same browser
  profile as the old app). If the key is present and matches the legacy
  shape, it's mapped and inserted the same way as the manual path, then
  the key is removed so it can't be re-imported later. If the key is
  present but doesn't parse/match, it's discarded rather than retried on
  every load. An empty "Default" dashboard is only created when no legacy
  key is found *and* no dashboards exist yet. Because this is a new-tab
  app, several instances routinely load at once (e.g. session restore); the
  actual bootstrap decision runs inside a cross-tab Web Locks mutex
  (`launch-tabs:bootstrap`) and re-reads `localStorage` and the dashboards
  collection *inside* the lock, so a losing tab sees the winner's write
  (already-imported legacy data, or an already-created Default dashboard)
  instead of duplicating it. Falls back to running unlocked where the Web
  Locks API is unavailable (e.g. jsdom in tests).

## Testing Focus

**Current actual coverage** (`yarn test`, 81 tests across 7 files):

- `lib/url.test.ts` — `normalizeUrl` scheme-prepending behavior.
- `lib/importExport.test.ts` — legacy-shape detection and
  `mapLegacyState` field mapping.
- `lib/keyboard.test.ts` — `isMac`/`shortcutLabel` on both platforms (via
  `vi.stubGlobal`), `isDialogOpen` with and without a `[role="dialog"]`
  element present, `dashboardShortcutDigit`'s 1–9-then-0 mapping.
- `hooks/useKeyboardShortcuts.test.ts` — `renderHook` + `fireEvent`, firing
  `keyCode`/`altKey` directly (hotkeys-js reads `event.keyCode`, not
  `event.key`): dashboard-switch digits including ⌥0 for the 10th position,
  exact chord matching (⌥⌘ doesn't also trigger ⌥), cycling with wrap on
  both arrow and bracket bindings, ⌥N, `shift+/`, and that all of the above
  are suppressed by auto-repeat, an input/textarea target, or an open
  dialog.
- `hooks/useAltHeld.test.ts` — alt keydown/keyup toggle the held state,
  `window` blur resets it, and an input target never sets it.
- `components/LinkEditModal.test.tsx` — URL-field validation on save
  (rejects invalid, accepts scheme-less, treats an empty background field
  as valid).
- `context/AppStateContext.test.tsx` — characterization tests for the
  `AppStateProvider` against an in-memory RxDB database (`src/test/testDb.ts`,
  RxDB's memory storage substituting for the real Dexie/IndexedDB adapter
  since jsdom has no IndexedDB): the bootstrap effect (first-load Default
  dashboard creation, automatic legacy-import with and without existing
  dashboards, malformed-legacy discard), `reorderLinks` and
  `moveLinkToDashboard` (asserting persisted, not just in-memory, state),
  `deleteDashboard`'s cascade delete and its last-dashboard no-op,
  `addLink`/`updateLink` ordering and URL normalization (including that
  `addLink` returns the new document's id), and clearing a dashboard's
  background image via `updateDashboard` (confirmed the field is actually
  removed from the stored document, not left stale — see "Known Gotchas"
  history for why this needed characterizing).

**Not currently covered by the automated suite**, despite React Testing
Library + jsdom being installed and configured (`src/test/setup.ts`):

- Drag-and-drop / click-suppression interaction, and the three
  reorder-positioning bugs documented in "Known Gotchas" — these were only
  ever verified with ad hoc Playwright sessions during development, not a
  checked-in test suite. Any change to drag/reorder/move logic should be
  manually re-verified in a real browser (per `AGENTS.md`), not just via
  typecheck/lint/unit tests.
- Broken-image fallback behavior (no component/DOM test renders a broken
  `<img>` and asserts the fallback).
- The held-⌥ digit badge's actual rendering (`DashboardTabs.tsx` +
  `useAltHeld`) and the ⌥←/⌥→ vs. Base UI's `Tabs.List` roving-focus
  interaction — `useAltHeld`'s state logic and `useKeyboardShortcuts`'s key
  handling are both unit-tested in isolation, but whether the badge visually
  avoids reflow and whether capture-phase `stopPropagation` actually beats
  Base UI's own arrow-key handling in a real DOM are browser-verified only.
- Everything `components/icons/HoverIcon.tsx` does: that its `closest()` walk
  finds the right control, that the enlarged `before:-inset-2` hit area and a
  text+icon button's label both drive the glyph, that pointer and focus compose
  on the rising edge, and that `useReducedMotion()` holds the icon still. None
  of it is reachable without layout and `requestAnimationFrame` — jsdom has
  neither — so it is browser-verified only, and a regression is silent: the
  icon simply stops animating while typecheck, lint and tests stay green. Note
  that a browser is not automatically enough either. A tab whose window is
  occluded reports `visibilityState: "hidden"`, which freezes rAF and makes
  every icon read as broken no matter what the code does; verify in a browser
  that is actually on screen, or drive one with Playwright (whose browser is
  never occluded, and which takes `reducedMotion: 'reduce'` as a context option
  rather than needing a `matchMedia` shim).

If component-level automated coverage is added later, these are the
remaining highest-value targets: drag-and-drop/click-suppression behavior
(browser-only, per the gotcha above), then broken-image fallback.

For the manual browser passes above, `docs/fixtures/animation-test-data.json`
is a ready-made export to load via the Import menu: enough links to force a
multi-row reorder, tiles with and without background images, a deliberately
broken image URL, a dashboard with a background, and an empty dashboard.

## Known Gotchas

- **A real drag-and-drop still fires a native `click` afterward, and
  dnd-kit relocates DOM nodes during the drag.** A per-tile `onClick`
  check against `isDragging` is not reliable: the click that follows a
  drag can land on a different (freshly-mounted) DOM node than the one a
  component-level handler was attached to, so the handler never fires
  and the tile's `<a href>` navigates anyway. The fix
  (`hooks/useLinkDragAndDrop.ts`) is a single `window`-level capture-phase
  `click` listener that calls `preventDefault()` when a ref (set from
  `DndContext`'s `onDragStart`, passed through from `App.tsx`) is true.
  This was confirmed empirically with Playwright; typecheck, lint,
  and unit tests all pass with the broken version, so any change to
  drag/click interaction needs a real browser check, not just those.
- **RxDB's reactive `find().$` can emit before persisted IndexedDB data
  has actually loaded into the subscription.** Don't treat "the database
  connected" as "the data is ready" — wait for the *first real query
  emission* before flipping a `ready` flag, or first-load bootstrap logic
  (e.g. "create a default dashboard if none exist") can misfire on every
  reload by momentarily seeing an empty array. See `AppStateContext.tsx`.
- **Dev-mode-only: a dropped reorder could briefly show the correct new
  position, then silently revert to the old one and stay there.** Root
  cause was `AppStateProvider`'s bootstrap `useEffect` subscribing to
  `database.links.find().$` *inside* an async `getDatabase().then(...)`
  callback, with `dashboardsSub`/`linksSub` only assigned once that promise
  resolves. `<StrictMode>` (`main.tsx`) mounts, cleans up, and remounts
  every effect once synchronously in dev — the cleanup from the first
  mount runs *before* the promise resolves, so it unsubscribes nothing
  (the variables are still `undefined`), and the subscriptions it
  eventually creates are never torn down. That first, orphaned subscription
  lives for the rest of the session alongside the second (correctly
  tracked) one, so every RxDB emission calls `setLinks` twice from two
  independent subscriptions — normally redundant no-ops via the
  `linksEqual` guard below, but capable of momentarily reasserting stale
  data depending on emission timing, which is what produced the
  "reverts after a correct drop" symptom. Confirmed by frame-by-frame
  analysis of a screen recording (not reproducible from a single
  screenshot — the correct state was visibly present for 1-2 frames
  before the revert). Fixed with the standard React idiom for this
  exact class of bug: a `cancelled` flag set in the effect's cleanup and
  checked at the top of the `.then()` callback, so a torn-down effect
  instance's async continuation is a no-op instead of leaking a
  subscription. Production builds don't run `<StrictMode>`'s
  double-invoke, so this was invisible there — but the underlying bug
  (an unguarded async subscription in an effect) was real regardless of
  whether double-invocation ever exposed it.
- **Tiles could jump to wrong positions (sometimes off-screen) right after
  dropping a drag-reorder.** This took three separate fixes, found by
  testing many drag distances/directions with Playwright and tracking
  each tile's position by its visible identity (not DOM index, which
  changes across a reorder) — a single screenshot comparison is not
  enough to confirm this class of bug is fixed:
  1. The grid container used `flex flex-wrap`, which `rectSortingStrategy`
     doesn't model correctly for cross-row moves. Switched to CSS Grid,
     and added `collisionDetection={closestCenter}` (standard for sortable
     grids).
  2. dnd-kit's drag preview reverts the instant you drop, before the
     reorder is actually persisted. `reorderLinks` originally did N
     concurrent `findOne`+`patch` calls; each one triggers its own RxDB
     reactive emission as soon as it resolves, so the `links` subscription
     kept overwriting the UI with partially-reordered intermediate states
     — one visible jump per write. Fixed by computing the full new order
     and applying it to local state *immediately* (before any persistence
     call), then writing it as a `bulkUpsert` instead of N separate writes
     — **this was believed to make the write atomic; see point 5, it
     doesn't for this case.**
  3. Even after that, the subscription's later, redundant-but-same-data
     emission (new array/object references once the bulkUpsert resolved)
     could land while dnd-kit's post-drop layout-change animation was
     still mid-flight, causing it to compute a bogus correction — observed
     a tile flying to `(1082, -147)`, off-screen above the viewport,
     before sliding back. Fixed by (a) having the `links` subscription
     skip `setLinks` entirely when the incoming data is equal to current
     state (see `linksEqual`), and (b) passing `animateLayoutChanges` to
     `useSortable` in `LinkTile.tsx` so the *settle-after-drop* transition
     specifically (`wasDragging`) snaps instantly instead of animating —
     the live drag-preview animation is untouched and still smooth.
  4. A separate, milder pop: `LinkTile.tsx`'s `opacity: isDragging ? 0.5 :
     1` snapped instantly on pickup/drop, because dnd-kit's own `transition`
     string is hardcoded to `property: "transform"` and never covers
     opacity. Fixed by combining the two into one `transition` value
     (`[transition, 'opacity 150ms var(--ease-out-strong)'].filter(Boolean).join(', ')`)
     rather than adding a `transition-opacity` class — an inline `style`
     always wins over a class for the same CSS property, so a class-based
     attempt would have been silently overridden by dnd-kit's own inline
     `transition`.
  5. **Point 2's `bulkUpsert` fix was itself incomplete**, discovered via
     frame-by-frame analysis of a screen recording after a fix for point 4
     didn't change the reported symptom at all: a drop could show the
     tile correctly in its new position for 1-2 frames, then revert to the
     old position, then self-correct back to the new one shortly after —
     a genuine data-level flicker, not a paint/animation one.
     `RxCollection.bulkUpsert` (`node_modules/rxdb/dist/cjs/rx-collection.js`)
     only uses the storage layer's real atomic `bulkWrite` for documents
     it can insert fresh; for documents that already exist — every link
     in a reorder — it falls back to `bulkInsert` (which 409-conflicts on
     all of them) followed by one `incrementalWriteQueue.addWrite` call
     *per document*, run via `Promise.all`. Each resolves independently
     and triggers its own reactive emission, so the `links` subscription
     sees a genuinely partially-reordered intermediate state (not merely
     a redundant-but-equal one) before the final consistent state lands —
     `linksEqual` doesn't help here since the intermediate data really is
     different from both the before and after state. Fixed with
     `reorderInFlightRef`: set before the `bulkUpsert` call, cleared in a
     `finally` after it resolves; the links subscription ignores every
     emission while it's set, trusting the optimistic update for that
     window instead of resyncing to whatever RxDB has partially applied.
     Because that drops *all* emissions, not just this reorder's own, the
     same `finally` clears the flag and then re-reads the collection once.
     Every dropped emission committed before that read, so the resync can't
     miss one — it recovers a concurrent write from another tab (routine in
     a new-tab app), and reverts the optimistic order if the write failed.
     `linksEqual` makes the usual case, where the resync matches the
     optimistic state, a no-op rather than a second render.
     No known way to make `bulkUpsert` itself atomic for pre-existing
     documents from the public `RxCollection` API — this is a real
     limitation of that method, not a configuration issue.

  Any future change to reorder/move logic should keep applying local-state
  updates optimistically and as a single batched write, and should be
  re-verified the same way (position-by-identity tracking across many
  drag distances/directions, not just one screenshot diff).

  `deleteLink` follows the same optimistic-update shape for an unrelated
  reason: `document.startViewTransition()` (used for the delete-reflow
  animation) needs the DOM already updated by the time its callback
  returns, so the local-state removal is applied synchronously via
  `flushSync` *before* the RxDB write, not after. The `linksEqual` guard
  above is what makes the write's later, redundant subscription emission a
  no-op instead of a second visible reflow.

- **The `ui/` wrappers moved from Radix UI to Base UI (`@base-ui/react`);
  `components.json` reads `base-luma`.** A few Base UI defaults differ from
  Radix's in ways that compile fine but change behavior:
  - `Tabs.List` defaults `activateOnFocus` to `false` (manual activation):
    arrow-keying between dashboard tabs only moves focus, and a dashboard
    only switches on an explicit `Enter`/`Space`. Radix switched
    immediately on arrow-key focus. Not patched — this is Base UI's
    idiomatic default, matching the shadcn base registry.
  - `Separator` has no `decorative` prop and is always exposed to
    assistive tech as `role="separator"`; Radix's wrapper defaulted
    `decorative={true}` (hidden from the accessibility tree). No current
    consumer relies on the decorative default, but a future purely-visual
    separator will pick up an extra a11y-tree node.
  - `AlertDialogAction` renders a plain `Button` and does **not**
    auto-close the dialog the way Radix's `Action` part did (`Dialog.Close`
    still does, this is specific to alert-dialog) — every current consumer
    (`ConfirmDialog.tsx`, `ImportExportBar.tsx`'s `FeedbackDialog`) closes
    itself explicitly in the action's `onClick`. See the dialog-lifecycle
    gotcha below for why this now matters more than a one-line fix.
  - `AspectRatio`'s registry-provided base variant sets the sizing
    `style={{"--ratio": ratio}}` and spreads `{...props}` *after* it, so a
    consumer-supplied `style` prop silently clobbers `--ratio` instead of
    merging with it. (No consumer passes `style` today — `LinkTile.tsx`
    used to, for its background image, before that moved to an `<img>`.) Our
    `aspect-ratio.tsx` destructures `style` and merges it explicitly
    (`{...style, "--ratio": ratio}`) — if this file is ever regenerated
    from the registry (`shadcn add aspect-ratio --overwrite`), reapply
    that merge or the aspect-ratio box will silently collapse whenever a
    consumer passes its own `style`.
  - Stacking multiple triggers on one element (e.g. a tooltip over a
    dropdown-menu trigger over a button) no longer uses nested `asChild`;
    it's nested `render`: `<TooltipTrigger render={<DropdownMenuTrigger
    render={<Button/>} />} />` (see `EntityOptionsMenu.tsx`,
    `ImportExportBar.tsx`). Each Base UI trigger forwards props/ref it
    doesn't recognize straight through to its own `render` target, so this
    composes the same way nested Radix `Slot`s used to.

- **A dialog conditionally mounted by its parent (`{editing && <EditDialog/>}`)
  never plays its exit animation unless it owns its own `open` state.**
  Flipping the parent's boolean straight to `false` unmounts the whole
  subtree in the same commit, so Base UI never applies `data-closed` and
  `animate-out`/`fade-out-0` never run. The dialog must instead own a local
  `open` state initialized to `true`, set it to `false` to close, and defer
  the parent's actual callback (`onClose`/`onConfirm`/`onCancel`) to
  `onOpenChangeComplete`, which Base UI fires only after the closing
  animation finishes. That three-part contract lives in one place —
  `hooks/useClosingDialog.ts`, which returns `{ close, dialogProps }` — so a
  new dialog gets it by spreading `dialogProps` rather than by
  re-deriving it; `ConfirmDialog.tsx` shows the variant that needs to know
  *which* outcome closed it. Call sites are unaffected — they still
  mount/unmount on their own boolean exactly as before.
- **An animated icon's own `trigger="hover"` is silently inert on every control
  in this app.** The phosphor-animated runtime attaches `onMouseEnter`/
  `onMouseLeave` to its `<motion.svg>` root, and `ui/button.tsx` plus the
  dropdown-menu item classes both set `[&_svg]:pointer-events-none` — so the
  icon never sees a hover. It compiles, lints and tests green while doing
  nothing. Even with pointer events restored the glyph is the wrong target: an
  icon-only button is mostly padding (and, at `icon-xs`, a `before:-inset-2`
  enlarged hit area), and a text+icon button like "Add link" is mostly not the
  glyph. `components/icons/HoverIcon.tsx` is the fix and the only supported way
  to use these icons: it renders with `trigger="none"`, holds the runtime's
  `AnimatedIconHandle`, and binds pointer/focus listeners to the nearest
  interactive ancestor (`closest('button, a, [role="menuitem"]')`). Two details
  of it are load-bearing:
  - It wraps the icon in a `<span className="contents">` purely to have a DOM
    node to run `closest()` from — the icon's own ref is the imperative handle,
    not an element. `display: contents` keeps the `<svg>` the control's own
    layout child, so `[&_svg:not([class*='size-'])]:size-4`, the
    `has-data-[icon=…]` padding rules and the flex `gap` all behave as before.
  - Pointer and focus are tracked separately and the icon plays on the rising
    edge of "either holds the control". Toggling on each event instead lets a
    `pointerleave` cut short an animation the control still has focus for, and
    latches the icon active after a menu closes back onto its own trigger —
    which makes the *next* hover a silent no-op, since `play()` only animates
    on a state change.
- **`animated-icon.tsx` is deliberately edited away from what the registry
  generates, and re-running `shadcn add` would silently undo it.** Upstream
  imports the full `motion` proxy; this copy imports `m` from `motion/react-m`
  and wraps each icon in `<LazyMotion features={loadMotionFeatures} strict>`,
  which moves Motion's DOM feature bundle (`motion-features.ts`) into its own
  async chunk. That is worth 76 kB off the initial chunk — 850.70 kB → 774.33 kB
  raw, 271.75 kB → 248.93 kB gzipped, against a 37.59 kB (14.22 kB gzipped)
  chunk that loads after first paint. It is the right trade here specifically
  because this is a new-tab page that loads fresh on every tab open, and an icon
  cannot be hovered before the page has loaded. Two traps:
  - Adding another icon runs `shadcn add`, which offers to overwrite
    `animated-icon.tsx` and restore the eager import. Nothing would fail — the
    icons still animate — the bundle just quietly grows back. Decline that
    overwrite, or re-apply the split afterwards.
  - `strict` is what keeps the split honest: a full `motion.*` component
    rendered inside `LazyMotion` throws instead of pulling the whole library
    back in. Without it that regression is invisible too. `domAnimation` covers
    animations, variants, exit and gestures; nothing here needs `domMax`'s
    layout animations or drag.

  `LazyMotion` renders only a context provider, no DOM element, so wrapping each
  icon individually costs no layout — which is what lets the icons stay
  self-contained rather than depending on a provider mounted somewhere up in
  `App.tsx`.
- **Reduced motion is enforced by three mechanisms, and the CSS one
  deliberately has a hole.** `src/index.css`'s
  `@media (prefers-reduced-motion: reduce)` block zeroes tw-animate-css's
  `--tw-enter-*`/`--tw-exit-*` variables, which covers every `animate-in`/
  `animate-out` popup automatically. It pointedly does *not* reset `scale`
  (the inline comment there explains why — `scale: 1` would make every
  matched element a containing block and break fixed-position dialogs), so
  any `scale-*`/`translate-*` utility written outside tw-animate-css must
  carry a `motion-safe:` prefix itself. Nothing enforces that: an
  unprefixed `active:scale-*` ships motion to reduced-motion users and
  passes typecheck, lint, and tests. The third mechanism is JS-side and covers
  the animated icons: `animated-icon.tsx` calls Motion's `useReducedMotion()`
  and pins the icon to its rest state, so `HoverIcon`'s `play()` is a no-op
  under the preference and no `motion-safe:` prefix is involved.
- **`hotkeys-js` latches its `capture` flag on the first binding registered
  per element, not per binding.** `elementEventMap` short-circuits listener
  registration for an element it's already seen, so a later
  `hotkeys(..., {capture: true}, ...)` on the same `document` silently
  inherits whatever the *first* binding on that element chose. Every binding
  in this codebase passes `{ capture: true }` for exactly this reason —
  capture is what lets `useKeyboardShortcuts`'s ⌥←/⌥→ handler
  `stopPropagation()` before Base UI's `Tabs.List` roving-focus arrow-key
  handler also reacts to it. A future binding added without `{ capture:
  true }` wouldn't fail to compile — it would silently either win or lose
  that race depending on registration order.
- **`hotkeys-js` is a module-level singleton**: one `hotkeys.filter`, one
  handler registry, one `_downKeys` array, shared by the whole page (and by
  the whole test process). Every test file that binds a hotkey must
  `hotkeys.unbind()` in `afterEach`, or its handlers leak into the next test
  file's assertions.
- **Holding Alt on Windows/Linux moves focus to the browser's menu bar and
  swallows the `keyup`.** `hotkeys-js` only resets its internal pressed-keys
  state on window *focus* (never *blur*, and it emits no event either way),
  so it can't drive `useAltHeld`'s badge-visibility state on its own.
  `useAltHeld` adds native `blur`/`visibilitychange`/`contextmenu` listeners
  specifically to reset the held state in those cases — removing them would
  strand the digit badges visible after the user alt-tabs away and back.

## Open Items

- Concrete RxDB `migrationStrategies` for the first collection schema
  change — see "Schema versioning" above; the export format side of this
  is done (`CURRENT_EXPORT_VERSION`), what remains open is only the RxDB
  collection-schema half.
- Which RxDB replication plugin to adopt, deferred until a backend is
  chosen.
- No custom domain is configured for GitHub Pages yet (deployed at the
  `/home-tab/` project-pages subpath); decide whether/when to add one, and
  update `vite.config.ts`'s `base` accordingly if so.
- No client-side validation beyond URL scheme normalization (see PRD "Open
  Items") — decide whether that's ever needed.
- No automated coverage for RxDB/drag-and-drop/reorder logic (see "Testing
  Focus") — decide whether to invest in component/e2e tests for these or
  keep relying on manual browser verification.
- `typescript` is still held at `~6.0.2` (not the current major, 7.x), but
  **nothing blocks the upgrade any more**. The pin existed because
  `typescript-eslint` hard-throws on any TS `>=7`; moving to oxlint deleted
  that dependency, and `yarn` is already on a version (4.17.1+) whose bundled
  `typescript` compatibility patch supports TS 7's restructured `lib/` layout.
  What remains is doing the bump and re-verifying `tsc -b`, Vite, and Vitest
  under TS 7 — tracked as its own plan.
