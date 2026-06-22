# Launch Tabs — Technical Design

Companion to [PRD.md](./PRD.md). Captures the concrete stack and
architecture decisions for implementing the PRD.

## Stack

- **Framework**: React + Vite
- **Language**: TypeScript
- **State management**: React Context + custom hooks (no Redux/Zustand) —
  thin wrappers around the storage layer described below
- **Local data store / storage abstraction**: RxDB (IndexedDB-backed via
  the Dexie storage adapter for v1)
- **Drag-and-drop**: `@dnd-kit/core`
- **Styling**: Tailwind CSS
- **Routing**: none — single root component, dashboard switching is a
  state change, not a navigation
- **Testing**: Vitest + React Testing Library (unit/component tests only;
  no Playwright/e2e for v1)
- **Hosting**: GitHub Pages with a custom domain
- **CI/CD**: GitHub Actions
  - `ci.yml` — runs on every push/PR: `tsc --noEmit`, ESLint, `vitest run`
  - `deploy.yml` — runs on push to `main`: `vite build` → deploy `dist/`
    to GitHub Pages

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

The currently active dashboard id is persisted separately (e.g. a small
`appMeta` collection/document, or a plain `localStorage` key — not worth
a full RxDB collection given it's a single value) and restored on load.

### Why two collections instead of one with embedded links

- Moving a link between dashboards is a single-field update
  (`dashboardId`), not array surgery on a parent document.
- Reordering is an `order` field update on one document, not a full
  array rewrite.
- Maps cleanly onto a relational/document backend later if a replication
  plugin is introduced.

## Key Interaction Implementation Notes

- **Reordering** (drag-and-drop within a dashboard): `@dnd-kit/core`
  sortable list; on drop, recompute and persist `order` values for
  affected links in the `links` collection.
- **Moving to another dashboard**: either via the hover menu's "Move
  to..." action, or by dragging a tile onto an entry in the dashboard
  list (`@dnd-kit` supports cross-container drag targets). Both paths
  update `dashboardId` and set `order` to `max(order in target) + 1`.
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

- **Export**: serialize all `dashboards` and `links` documents (plus
  active-dashboard id) to a single JSON file and trigger a download.
- **Import (new format)**: parse the JSON, validate shape, and bulk
  upsert into the `dashboards`/`links` collections.
- **Import (legacy format, manual)**: detect the old shape
  (`{ links: [...], backgroundUrl }`) and map it per the PRD's "Export /
  Import" section — one new dashboard named "Imported", `backgroundUrl`
  becomes its `backgroundImageUrl`, and each old link becomes a `links`
  document (`label→title`, `url→url`, `image→backgroundImageUrl`;
  `color`/`isDisabled`/`key`/`id` dropped).
- **Import (legacy format, automatic)**: the bootstrap effect in
  `AppStateContext.tsx` checks `localStorage.getItem('state')` on every
  load, *independent of how many dashboards already exist* — a user may
  have opened the app once before (creating an empty "Default") and only
  later end up with legacy data in `localStorage` (e.g. same browser
  profile as the old app). If the key is present and matches the legacy
  shape, it's mapped and inserted the same way as the manual path, then
  the key is removed so it can't be re-imported later. An empty "Default"
  dashboard is only created when no legacy key is found *and* no
  dashboards exist yet.

## Testing Focus

Per the PRD's higher-risk areas, prioritize Vitest + RTL coverage on:

- RxDB schema/CRUD logic (dashboards, links, cascade delete)
- Import/export, including legacy-format mapping
- Reorder and move-between-dashboards logic
- URL normalization and broken-image fallback behavior

## Known Gotchas

- **A real drag-and-drop still fires a native `click` afterward, and
  dnd-kit relocates DOM nodes during the drag.** A per-tile `onClick`
  check against `isDragging` is not reliable: the click that follows a
  drag can land on a different (freshly-mounted) DOM node than the one a
  component-level handler was attached to, so the handler never fires
  and the tile's `<a href>` navigates anyway. The fix (`App.tsx`) is a
  single `window`-level capture-phase `click` listener that calls
  `preventDefault()` when a ref (set in `DndContext`'s `onDragStart`) is
  true. This was confirmed empirically with Playwright; typecheck, lint,
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

## Open Items

- Exact RxDB schema versioning/migration strategy as the data model
  evolves (RxDB supports schema migrations; define the first migration
  path before shipping v1.1+ changes).
- Which RxDB replication plugin to adopt, deferred until a backend is
  chosen.
