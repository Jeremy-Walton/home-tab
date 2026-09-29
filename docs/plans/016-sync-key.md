# 016 — Sync key (Durable Object replication)

Status: **planned** — not started.

## Goal

Let several browsers share one set of dashboards and links, with no accounts.
A browser that knows a **sync key** can read and write that key's data, and
sees changes from other browsers live.

## Context

- Hosting already moved to a Cloudflare Worker with static assets
  (`wrangler.jsonc`, phase 1 — shipped in `b18788e`).
- Data lives in RxDB (`src/storage/db.ts`), two collections, both schema
  `version: 0`. RxDB was chosen partly so a backend could be added via
  replication (`docs/TECHNICAL_DESIGN.md`, "Why RxDB").

## Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Backend | Cloudflare Durable Object, **one object per sync key**, SQLite-backed | Free tier; one object serializes all writes for a key, so no races between browsers |
| Transport | HTTP `pull`/`push` endpoints, plus a WebSocket (Hibernation API) that only sends a "changed" poke | RxDB's documented `RESYNC` pattern; no request/response matching over the socket. Ceiling: every change costs one HTTP pull per connected browser — move pull/push onto the socket if the 100k req/day free limit ever matters |
| Client protocol | RxDB's generic `replicateRxCollection` (`rxdb/plugins/replication`, free core) with custom pull/push handlers | RxDB already handles deletes (`_deleted` tombstones), conflicts, retries, checkpoints |
| Server metadata | Server stores a per-key monotonic `seq` per doc; checkpoint is `{ seq }` | Keeps client RxDB schemas at `version: 0` — no migration needed |
| Conflicts | Server rejects a push row whose `assumedMasterState` doesn't equal its stored doc (stable-key JSON compare) and returns the stored doc; client uses RxDB's default handler (server wins) | Standard RxDB contract; no custom merge logic |
| One Worker | Same Worker serves `dist/` and `/api/sync/*`; assets match first, `/api/*` falls through to the Worker | One deploy, same origin, no CORS |
| Sync key format | `crypto.randomUUID()` (122 random bits); Worker rejects anything that isn't a UUID | The key is the only access control |
| Encryption | **None** — plain JSON in the Durable Object | Simplest and debuggable; anyone with the key or Cloudflare account access can read it. Add later by rotating to a new key |
| Creating a new key | The creating browser pushes its current local data as the key's starting state | Nothing to replace — the key is empty |
| Joining an existing key | **Replace local**: check the key has data, offer an export backup, then wipe local and pull the key's data | Avoids duplicates (every fresh browser has its own "Default" dashboard) |
| Stop syncing | **Keep a local copy**: stop replication, forget the key; data stays as a local-only copy | Nothing lost; other browsers unaffected |
| Sync UI | A **"Sync…" item** in the existing import/export menu opens a Sync dialog. Not synced: "Create sync key" button, or a key field + "Join". Synced: the key with a Copy button, connection status, "Stop syncing" | Top bar keeps the PRD's single icon button; status is visible only in the dialog |
| Multi-tab | `waitForLeadership: true` (RxDB leader-election plugin) | A new-tab app has many tabs open; only one per browser needs a socket. Other tabs see changes through Dexie's cross-tab broadcast |
| Local dev | `@cloudflare/vite-plugin` — `yarn dev` runs app + Worker + DO in one process | Official path; real Workers runtime locally |

## Hazards (must be handled, not accepted)

1. **Wiping local data with `find().remove()` would delete the key's data for
   everyone.** RxDB removes docs by writing `_deleted` tombstones, and a new
   replication pushes every local change — including those tombstones — to
   the server. The join wipe must drop storage entirely (`db.remove()`), not
   delete documents. Easiest correct flow: save the key, `db.remove()`,
   `location.reload()`; the fresh load starts from an empty database.
2. **Bootstrap could push a stray "Default" dashboard to the key.** A fresh
   (post-wipe) load sees zero dashboards and creates "Default" before the
   pull lands. When a sync key is set, bootstrap must `await
   replicationState.awaitInitialReplication()` before deciding.
3. **A mistyped key on Join would wipe local data and pull nothing.** Join
   first calls `GET /api/sync/:key` and refuses a key with no documents.
4. **Other open tabs keep the old database after a join/stop.** Listen for
   the `storage` event on the sync-key `localStorage` entry and reload.
5. **Vitest shares `vite.config.ts`.** Load the Cloudflare plugin only when
   `process.env.VITEST` is unset, or tests boot the Workers runtime.

## Known edge cases (accepted)

- The active dashboard stays per-browser (`localStorage`), never synced.
- Two browsers reordering the same dashboard at once: server-wins per link, so
  the merged order can interleave. Acceptable for a personal tool.
- A link added in browser A to a dashboard browser B deletes at the same time
  is orphaned (`dashboardId` points nowhere). It is invisible and harmless;
  no cleanup job.
- Legacy auto-import in a synced browser pushes the "Imported" dashboard to
  the key. That is the desired outcome.
- No way to delete a key's server data for everyone. Add when asked.

## Scope

New:

- `worker/index.ts` — `fetch` handler: parse `/api/sync/:key/...`, validate
  the key is a UUID, forward to `env.SYNC_ROOM.getByName(key)`; everything
  else is served by assets before the Worker runs.
- `worker/SyncRoom.ts` — the Durable Object. SQLite table
  `docs(collection, id, data, seq, PRIMARY KEY(collection, id))`. Routes:
  - `GET  /api/sync/:key` → `{ count }` (Join check)
  - `POST /api/sync/:key/:collection/pull` `{ checkpoint, batchSize }` →
    `{ documents, checkpoint }`
  - `POST /api/sync/:key/:collection/push` `rows[]` → conflicting master docs
  - `GET  /api/sync/:key/ws` → WebSocket; server sends `"changed"` after
    every successful push, to every socket (`ctx.getWebSockets()`)
- `worker/conflict.ts` + `worker/conflict.test.ts` — the stable-key JSON
  equality used for conflict detection, and the key validator. Pure
  functions, plain Vitest.
- `tsconfig.worker.json` + generated `worker-configuration.d.ts`
  (`wrangler types`), referenced from `tsconfig.json` so `tsc -b` checks it.
- `src/storage/sync.ts` — `startSync(db, key)`: one `replicateRxCollection`
  per collection (`replicationIdentifier: launch-tabs-<collection>-<key>`,
  `live: true`, `waitForLeadership: true`), the WebSocket feeding
  `pull.stream$` with `"RESYNC"`, and a status observable. Returns `stop()`.
- `src/components/SyncDialog.tsx` — built on `EditDialog`/`useClosingDialog`
  patterns; the three flows (create / join / stop).

Changed:

- `wrangler.jsonc` — `main`, the `SYNC_ROOM` Durable Object binding, and a
  `migrations` entry with `new_sqlite_classes: ["SyncRoom"]` (free plan
  requires SQLite-backed objects).
- `vite.config.ts` — add `cloudflare()` (skipped under Vitest).
- `package.json` — `@cloudflare/vite-plugin` dev dependency.
- `src/storage/db.ts` — `addRxPlugin(RxDBLeaderElectionPlugin)`.
- `src/context/AppStateContext.tsx` — start/stop sync from the stored key
  (`launch-tabs:syncKey`), make bootstrap wait for the initial replication,
  expose `createSyncKey`, `joinSyncKey`, `stopSync`, and `syncStatus`.
- `src/components/ImportExportBar.tsx` — "Sync…" menu item.
- `.github/workflows/deploy.yml` — likely unchanged; confirm `wrangler
  deploy` picks up the config the Vite plugin writes at build time.
- Docs: `docs/PRD.md` (Scope and "Out of Scope" currently say no sync; add a
  "Sync" section), `docs/TECHNICAL_DESIGN.md` (Stack, Project Structure,
  Testing Focus, Known Gotchas — hazard 1 belongs there), `AGENTS.md`
  (Current State, Commands if `yarn dev` changes).

## Phases

Each phase ends green on `yarn build`, `yarn lint`, `yarn format:check`,
`yarn test`.

1. **Server.** Worker, `SyncRoom`, wrangler config, worker tsconfig, Vite
   plugin, `conflict.test.ts`. Verify with `curl` against `yarn dev`: push a
   doc, pull it back, push a stale `assumedMasterState` and get a conflict.
2. **Client replication.** `sync.ts`, leader election, bootstrap wait,
   stored key. No UI yet — set `launch-tabs:syncKey` by hand in two browser
   profiles and confirm edits, reorders, moves, and deletes cross over live.
3. **UI.** `SyncDialog`, menu item, create/join/stop flows, cross-tab
   reload. Verify hazards 1–4 by hand: join from a browser with its own data
   (the key's data must survive), join with a bad key, stop and keep data.
4. **Docs + deploy.** PRD, TECHNICAL_DESIGN, AGENTS. Deploy, then repeat the
   phase 3 checks on `https://www.launchtabs.com`.
