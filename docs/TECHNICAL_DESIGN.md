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
- **Styling**: Tailwind CSS v4
- **UI component layer**: [shadcn/ui](https://ui.shadcn.com) (`base-luma`
  style/preset) generating thin wrappers in `src/components/ui/`, built on
  **Base UI** (`@base-ui/react`) primitives — not Radix UI; this project
  migrated off Radix (see "Known Gotchas"). `class-variance-authority` for
  variant props, `tailwind-merge`/`clsx` (via the `cn()` helper) for class
  composition, Phosphor (`@phosphor-icons/react`) for icons.
- **Fonts**: self-hosted variable fonts via `@fontsource-variable`
  (Space Grotesk for body/sans, Figtree for headings).
- **Routing**: none — single root component, dashboard switching is a
  state change, not a navigation.
- **Testing**: Vitest (+ jsdom, React Testing Library installed and
  configured) — see "Testing Focus" for what's actually covered today.
- **Hosting**: GitHub Pages, deployed under the repository's default
  project-pages path (`https://<user>.github.io/home-tab/`, per `base:
  '/home-tab/'` in `vite.config.ts`). **No custom domain is configured at
  this time** (no `CNAME`), unlike earlier plans — see "Open Items."
- **CI/CD**: GitHub Actions
  - `ci.yml` — runs `yarn lint`, `yarn tsc -b`, `yarn test` on push to
    `main` and on every pull request.
  - `deploy.yml` — runs `yarn build` → deploys `dist/` to GitHub Pages on
    push to `master`.
  - Note: `ci.yml` watches `main` while `deploy.yml` watches `master`,
    and `master` is this repo's actual default/primary branch — see
    "Open Items."

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
- `src/lib/` — `id.ts` (`generateId`, currently `crypto.randomUUID()`),
  `url.ts` (`normalizeUrl`), `importExport.ts` (format detection +
  legacy-mapping, see `docs/DATA_FORMATS.md`), `dashboardDropId.ts` (encodes/
  decodes the synthetic droppable id used for the "drop a tile on a
  dashboard tab" gesture), `utils.ts` (the shadcn `cn()` class helper).
- `src/components/` — one file per app-specific component:
  `App.tsx` (root: `DndContext` + layout shell), `Navbar.tsx`,
  `DashboardTabs.tsx` (tab strip + per-tab options menu),
  `DashboardGrid.tsx` (grid/empty-state switch + sortable context),
  `LinkTile.tsx`, `EmptyState.tsx`, `EntityOptionsMenu.tsx` (the shared
  dropdown used by both dashboards and links), `ConfirmDialog.tsx` (shared
  delete-confirmation), `EditDialog.tsx` (shared edit-modal shell),
  `LinkEditModal.tsx`/`DashboardEditModal.tsx` (field sets on top of
  `EditDialog`), `ImportExportBar.tsx`, `LogoIcon.tsx`/`Wordmark.tsx`
  (branding).
- `src/components/ui/` — shadcn-generated primitive wrappers (`button`,
  `dialog`, `alert-dialog`, `dropdown-menu`, `tabs`, `tooltip`, `badge`,
  `aspect-ratio`, `label`, `separator`, `field`, `input`, `empty`); treat
  these as vendored/generated code, not hand-authored app logic.

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
  key is found *and* no dashboards exist yet.

## Testing Focus

**Current actual coverage** (`yarn test`, 10 tests across 2 files) is pure
unit tests only, no RxDB/DOM involved:

- `lib/url.test.ts` — `normalizeUrl` scheme-prepending behavior.
- `lib/importExport.test.ts` — legacy-shape detection and
  `mapLegacyState` field mapping.

**Not currently covered by the automated suite**, despite React Testing
Library + jsdom being installed and configured (`src/test/setup.ts`):

- RxDB schema/CRUD logic (dashboards, links, cascade delete on dashboard
  removal).
- Reorder and move-between-dashboards logic (`reorderLinks`,
  `moveLinkToDashboard`).
- The bootstrap/legacy-auto-import effect's interaction with RxDB's
  reactive query timing (see "Known Gotchas").
- Drag-and-drop / click-suppression interaction, and the three
  reorder-positioning bugs documented in "Known Gotchas" — these were only
  ever verified with ad hoc Playwright sessions during development, not a
  checked-in test suite. Any change to drag/reorder/move logic should be
  manually re-verified in a real browser (per `AGENTS.md`), not just via
  typecheck/lint/unit tests.
- Broken-image fallback behavior (no component/DOM test renders a broken
  `<img>` and asserts the fallback).

If component-level automated coverage is added later, these are the
highest-value targets, in roughly this priority order: reorder/move
logic (highest regression risk historically), the bootstrap/legacy-import
effect, cascade-delete, then broken-image fallback.

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
     call), then writing it as a *single* `bulkUpsert` instead of N
     separate writes.
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

  Any future change to reorder/move logic should keep applying local-state
  updates optimistically and as a single batched write, and should be
  re-verified the same way (position-by-identity tracking across many
  drag distances/directions, not just one screenshot diff).

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
    still does, this is specific to alert-dialog). Both current call sites
    (`DashboardTabs.tsx`, `LinkTile.tsx`) unmount the dialog themselves in
    `onConfirm`, so this is invisible today — any new `AlertDialogAction`
    consumer must close the dialog itself.
  - `AspectRatio`'s registry-provided base variant sets the sizing
    `style={{"--ratio": ratio}}` and spreads `{...props}` *after* it, so a
    consumer-supplied `style` prop (e.g. `LinkTile.tsx`'s background image
    styling) silently clobbers `--ratio` instead of merging with it. Our
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

## Open Items

- Exact RxDB schema versioning/migration strategy as the data model
  evolves (RxDB supports schema migrations; define the first migration
  path before shipping v1.1+ changes). The current export format also has
  no explicit version field — see `docs/DATA_FORMATS.md`.
- Which RxDB replication plugin to adopt, deferred until a backend is
  chosen.
- No custom domain is configured for GitHub Pages yet (deployed at the
  `/home-tab/` project-pages subpath); decide whether/when to add one, and
  update `vite.config.ts`'s `base` accordingly if so.
- `ci.yml` triggers on push to `main`; `deploy.yml` triggers on push to
  `master`, which is this repo's actual primary branch. Confirm this is
  intentional (e.g. a `main` branch is planned) or align the two.
- No client-side validation beyond URL scheme normalization (see PRD "Open
  Items") — decide whether that's ever needed.
- No automated coverage for RxDB/drag-and-drop/reorder logic (see "Testing
  Focus") — decide whether to invest in component/e2e tests for these or
  keep relying on manual browser verification.
