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
| `backgroundColor` | string (optional) |                                          |

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
  `onError` handler on the `<img>`/background element, falling back to
  the link/dashboard's `backgroundColor` (or a default color) rather than
  showing a broken-image icon.
- **URL normalization**: a small utility run on save — if the string
  doesn't start with a recognized scheme, prepend `https://`.

## Export / Import

- **Export**: serialize all `dashboards` and `links` documents (plus
  active-dashboard id) to a single JSON file and trigger a download.
- **Import (new format)**: parse the JSON, validate shape, and bulk
  upsert into the `dashboards`/`links` collections.
- **Import (legacy format)**: detect the old shape
  (`{ links: [...], backgroundUrl }`) and map it per the PRD's "Export /
  Import" section — one new dashboard named "Imported", `backgroundUrl`
  becomes its `backgroundImageUrl`, and each old link becomes a `links`
  document (`label→title`, `url→url`, `image→backgroundImageUrl`,
  `color→backgroundColor`; `isDisabled`/`key`/`id` dropped).

## Testing Focus

Per the PRD's higher-risk areas, prioritize Vitest + RTL coverage on:

- RxDB schema/CRUD logic (dashboards, links, cascade delete)
- Import/export, including legacy-format mapping
- Reorder and move-between-dashboards logic
- URL normalization and broken-image fallback behavior

## Open Items

- Exact RxDB schema versioning/migration strategy as the data model
  evolves (RxDB supports schema migrations; define the first migration
  path before shipping v1.1+ changes).
- Which RxDB replication plugin to adopt, deferred until a backend is
  chosen.
