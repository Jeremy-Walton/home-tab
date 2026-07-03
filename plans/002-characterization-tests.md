# Plan 002: Add characterization tests for the app-state layer (reorder, move, bootstrap, cascade delete)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- src/context/ src/storage/ src/test/ docs/TECHNICAL_DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW (mostly additive; one contingent behavior fix, see Step 5)
- **Depends on**: none (001 recommended first so CI runs these tests)
- **Category**: tests
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

The only automated tests today are 10 pure unit tests for `normalizeUrl` and
the legacy import mapping. Every real bug in this app's history lived in the
state layer — drag reorder (three separate fixes), the bootstrap/legacy
import effect, RxDB subscription timing — and none of it has coverage.
`docs/TECHNICAL_DESIGN.md` explicitly names these as the highest-value test
targets. Several other planned changes (plans 003, 005, 006, 007) modify
exactly this code; this plan is their safety net and must land first.

This plan also settles an open question (finding #6 from the audit): whether
clearing a background image via the edit dialog actually removes the stored
field — the modals pass `backgroundImageUrl: undefined` into an RxDB
`patch()`, and it is unverified whether that deletes the field or silently
does nothing. Step 5 turns that into a test plus a contingent fix.

## Current state

- `src/context/AppStateContext.tsx` — `AppStateProvider`: owns the RxDB
  subscriptions, the bootstrap/legacy-import effect, and every mutation
  (`addDashboard`, `updateDashboard`, `deleteDashboard`, `addLink`,
  `updateLink`, `deleteLink`, `reorderLinks`, `moveLinkToDashboard`,
  `exportState`, `importState`). This is the module under test. Key facts:
  - It gets its database via `getDatabase()` from `../storage/db`.
  - The active dashboard id is persisted in
    `localStorage['launch-tabs:activeDashboardId']`.
  - The legacy blob is read from `localStorage['state']`.
  - The bootstrap effect (lines 85–129) waits for `ready` (first real
    dashboards emission), then: if a legacy blob exists → import it as an
    "Imported" dashboard and delete the key (malformed blobs are also
    deleted); else if zero dashboards exist → create one named "Default".
  - `updateDashboard` (lines 157–168) and `updateLink` (lines 195–209) do
    `findOne(id).exec()` then `doc?.patch(patch)`, normalizing URL fields
    when they are not `undefined`. The edit modals pass
    `backgroundImageUrl: backgroundImageUrl || undefined` — i.e. clearing
    the field sends `undefined` into `patch()`.
  - `deleteDashboard` (lines 170–179) refuses when `dashboards.length <= 1`,
    otherwise deletes the dashboard's links then the dashboard.
  - `reorderLinks` (lines 217–238) applies the new order to local state
    optimistically, then persists via a **single** `bulkUpsert`. This
    single-batched-write behavior is load-bearing (see gotcha below) —
    characterize the *outcome* (final persisted `order` values), not the
    write mechanics.
  - `moveLinkToDashboard` (lines 240–247) sets `dashboardId` and
    `order = max(order in target) + 1`.
- `src/storage/db.ts` — creates the singleton RxDB database with the Dexie
  (IndexedDB) storage adapter. Exports `getDatabase(): Promise<AppDatabase>`
  and the types `AppDatabase` / `AppCollections`. jsdom has no IndexedDB, so
  tests must substitute RxDB's memory storage (verified available at
  `rxdb/plugins/storage-memory` in the installed rxdb ^17.3.0).
- `src/storage/schemas.ts` — exports `dashboardSchema` and `linkSchema`
  (RxDB JSON schemas). Reuse these in the test database so tests exercise
  the real schemas.
- `src/context/useAppState.ts` — the consumer hook (`useAppState()`), throws
  if used outside the provider.
- `src/lib/importExport.ts` — `isLegacyState` / `mapLegacyState` used by the
  bootstrap effect.
- Vitest is configured in `vite.config.ts` (`environment: 'jsdom'`,
  `setupFiles: './src/test/setup.ts'`, `globals: true`). `setup.ts` imports
  `@testing-library/jest-dom/vitest`. React Testing Library 16 and
  user-event are installed but unused so far.
- Existing test style (match it): explicit imports from `'vitest'` despite
  `globals: true` — see `src/lib/importExport.test.ts` (`import { describe,
  expect, it } from 'vitest'`), plain `describe`/`it`, `toMatchObject` for
  partial object assertions.

Documented gotcha to honor (quoted from `docs/TECHNICAL_DESIGN.md`):

> RxDB's reactive `find().$` can emit before persisted IndexedDB data has
> actually loaded into the subscription. Don't treat "the database connected"
> as "the data is ready" — wait for the *first real query emission* before
> flipping a `ready` flag.

In tests this means: always `await waitFor(() => expect(result.current.ready).toBe(true))`
before asserting anything, and after mutations `waitFor` the expected state
rather than asserting synchronously.

## Commands you will need

| Purpose   | Command       | Expected on success |
|-----------|---------------|---------------------|
| Tests     | `yarn test`   | all pass            |
| Typecheck | `yarn tsc -b` | exit 0              |
| Lint      | `yarn lint`   | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `src/test/testDb.ts` (create)
- `src/context/AppStateContext.test.tsx` (create)
- `src/context/AppStateContext.tsx` — **only** if the Step 5 contingency
  fires (the clear-background fix), nothing else.
- `docs/TECHNICAL_DESIGN.md` — update the "Testing Focus" section at the end.

**Out of scope** (do NOT touch, even though they look related):
- `src/storage/db.ts` — do not add test seams; tests mock the module instead.
- `src/hooks/useLinkDragAndDrop.ts` and anything drag-and-drop — the
  drag/click interaction is only verifiable in a real browser (documented
  gotcha); do not attempt jsdom tests for it.
- `src/lib/importExport.ts` and `importState` behavior — plan 003 changes
  those; don't pre-characterize `importState` beyond what's listed below.
- The two existing test files (`url.test.ts`, `importExport.test.ts`).

## Git workflow

- Branch: `advisor/002-characterization-tests`
- Commit per logical unit (test helper, then test suites); imperative style,
  e.g. `Add app-state characterization tests`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the in-memory test database helper

Create `src/test/testDb.ts`:

```ts
import { createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
import { dashboardSchema, linkSchema } from '../storage/schemas'
import type { AppCollections, AppDatabase } from '../storage/db'

let counter = 0

export async function createTestDatabase(): Promise<AppDatabase> {
  const db = await createRxDatabase<AppCollections>({
    name: `test-db-${Date.now()}-${counter++}`,
    storage: getRxStorageMemory(),
    multiInstance: false,
  })
  await db.addCollections({
    dashboards: { schema: dashboardSchema },
    links: { schema: linkSchema },
  })
  return db
}
```

Notes: the unique name avoids RxDB duplicate-database errors across tests;
`multiInstance: false` avoids BroadcastChannel machinery in jsdom.

**Verify**: `yarn tsc -b` → exit 0.

### Step 2: Create the test file with provider harness

Create `src/context/AppStateContext.test.tsx`. Skeleton:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AppStateProvider } from './AppStateContext'
import { useAppState } from './useAppState'
import { createTestDatabase } from '../test/testDb'
import type { AppDatabase } from '../storage/db'

let testDb: AppDatabase

vi.mock('../storage/db', () => ({
  getDatabase: () => Promise.resolve(testDb),
}))

function renderAppState() {
  return renderHook(() => useAppState(), { wrapper: AppStateProvider })
}

async function readyAppState() {
  const rendered = renderAppState()
  await waitFor(() => expect(rendered.result.current.ready).toBe(true))
  // Bootstrap runs after ready; wait until it has settled (at least one
  // dashboard exists in every scenario this suite creates).
  await waitFor(() => expect(rendered.result.current.dashboards.length).toBeGreaterThan(0))
  return rendered
}

beforeEach(async () => {
  localStorage.clear()
  testDb = await createTestDatabase()
})

afterEach(async () => {
  await testDb.remove()
})
```

Notes:
- `vi.mock` is hoisted; the factory closes over the `let testDb` variable,
  which is assigned in `beforeEach` before any component calls
  `getDatabase()`. The mock intentionally replaces the whole module —
  `AppStateContext.tsx` only imports `getDatabase` as a value from it
  (`AppDatabase` is a type-only import, erased at runtime).
- To seed data before the provider mounts, insert directly into `testDb`
  (e.g. `await testDb.dashboards.insert({ id: 'd1', name: 'Default',
  order: 0, createdAt: 1 })`) and only then call `renderAppState()`.
- To assert persisted (not just in-memory) state, query `testDb` directly:
  `const docs = await testDb.links.find().exec()`.

Add one smoke test to prove the harness works:

```tsx
it('creates a Default dashboard on first load', async () => {
  const { result } = await readyAppState()
  expect(result.current.dashboards).toHaveLength(1)
  expect(result.current.dashboards[0].name).toBe('Default')
  expect(localStorage.getItem('launch-tabs:activeDashboardId')).toBe(
    result.current.dashboards[0].id,
  )
})
```

**Verify**: `yarn test` → all pass (existing 10 + this one). If React logs
`act(...)` warnings, wrap state-reading waits in `waitFor` (as above) —
warnings are acceptable, failures are not.

### Step 3: Bootstrap / legacy-import tests

Add a `describe('bootstrap', ...)` block with these cases (exact behavior is
specified by `docs/DATA_FORMATS.md`'s "Automatic migration trigger" section):

1. **does not create a second dashboard when one already exists** — seed one
   dashboard into `testDb` before rendering; after ready, exactly 1
   dashboard.
2. **auto-imports legacy localStorage state into an "Imported" dashboard** —
   `localStorage.setItem('state', JSON.stringify({ backgroundUrl:
   'https://example.com/bg.jpg', links: [{ label: 'GitHub', url:
   'github.com', image: 'https://example.com/gh.png' }] }))` before
   rendering. Expect: one dashboard named `Imported` with
   `backgroundImageUrl: 'https://example.com/bg.jpg'`; one link with
   `title: 'GitHub'`, `url: 'https://github.com'`; `localStorage.getItem('state')`
   is `null`; active dashboard id is the imported dashboard's id; **no**
   "Default" dashboard was created.
3. **imports legacy state even when dashboards already exist** — seed one
   dashboard AND set the legacy key; expect 2 dashboards, the "Imported" one
   with `order` = existing max + 1.
4. **discards malformed legacy state and still creates Default** —
   `localStorage.setItem('state', 'not json')`; expect the key removed and a
   single "Default" dashboard.

**Verify**: `yarn test` → all pass.

### Step 4: Mutation tests (reorder, move, cascade delete, add)

Add cases (seed a dashboard `d1` — and where needed `d2` — plus links
directly into `testDb` before rendering; use fixed ids like `l1`,`l2`,`l3`
with `order` 0,1,2):

5. **addLink appends with the next order** — call
   `result.current.addLink('d1')` on a dashboard with 2 links; `waitFor` a
   third link with `order: 2`, `title: 'New link'`, `url: 'https://example.com'`.
6. **reorderLinks persists the new order** — seed l1,l2,l3; call
   `result.current.reorderLinks('d1', ['l3', 'l1', 'l2'])`; `waitFor` state
   where l3.order=0, l1.order=1, l2.order=2; then assert the same orders on
   `await testDb.links.find().exec()` (persisted, not just optimistic).
7. **reorderLinks leaves other dashboards' links untouched** — seed a link
   on `d2`; after reordering `d1`, the `d2` link's `order` is unchanged.
8. **moveLinkToDashboard appends to the end of the target dashboard** — seed
   l1 on d1 and l2 (order 0) on d2; move l1 to d2; expect l1 has
   `dashboardId: 'd2'`, `order: 1`, persisted.
9. **deleteDashboard cascades link deletion** — 2 dashboards, 2 links on d1;
   delete d1; `waitFor` 1 dashboard; `testDb.links` count for d1 is 0.
10. **deleteDashboard is a no-op for the last remaining dashboard** — 1
    dashboard; call delete; dashboard still exists (give the no-op a tick:
    assert after a `waitFor` on something stable, or `await
    result.current.deleteDashboard(id)` then assert).
11. **updateLink normalizes scheme-less URLs** — `updateLink('l1', { url:
    'github.com' })` → persisted url `https://github.com`.

**Verify**: `yarn test` → all pass.

### Step 5: Characterize clearing a background image (audit finding #6)

Add:

12. **clearing a background image removes it from the stored document** —
    seed a dashboard with `backgroundImageUrl: 'https://example.com/bg.jpg'`;
    call `result.current.updateDashboard(id, { backgroundImageUrl: undefined })`
    (this is exactly what `DashboardEditModal.tsx:25` sends when the field is
    emptied); then read the doc from `testDb` and expect
    `doc.toJSON().backgroundImageUrl` to be `undefined`.

**Contingency**: it is genuinely unknown whether RxDB's `patch()` with an
`undefined` value removes the field. If this test **fails** (the old URL
survives), apply this fix in `src/context/AppStateContext.tsx` and re-run —
replace the body of `updateDashboard` with an `incrementalModify` that
deletes cleared keys:

```ts
async function updateDashboard(
  id: string,
  fields: Partial<Pick<Dashboard, 'name' | 'backgroundImageUrl'>>,
) {
  if (!db) return
  const doc = await db.dashboards.findOne(id).exec()
  if (!doc) return
  await doc.incrementalModify((data) => {
    if (fields.name !== undefined) data.name = fields.name
    if ('backgroundImageUrl' in fields) {
      const normalized = fields.backgroundImageUrl
        ? normalizeUrl(fields.backgroundImageUrl)
        : ''
      if (normalized) data.backgroundImageUrl = normalized
      else delete data.backgroundImageUrl
    }
    return data
  })
}
```

and the equivalent change in `updateLink` (fields: `title`, `url`,
`backgroundImageUrl`; `url` is always normalized when present; only
`backgroundImageUrl` is deletable). Add the mirror test for links. If the
fix fires, note in your report that the memory storage and the real Dexie
storage could differ here, and recommend the operator do a one-minute
browser check (set a background, clear it, reload).

If the test **passes** unmodified, do not touch `AppStateContext.tsx` at all;
record in your report that finding #6 was investigated and is not a bug.

**Verify**: `yarn test` → all pass.

### Step 6: Update the design doc

In `docs/TECHNICAL_DESIGN.md`, rewrite the "Testing Focus" section: the
current-coverage paragraph now includes the app-state characterization suite
(`src/context/AppStateContext.test.tsx`, in-memory RxDB storage via
`src/test/testDb.ts`); remove reorder/move, bootstrap/legacy-import, and
cascade-delete from the "not covered" list. Keep drag-and-drop/click
suppression and broken-image fallback listed as uncovered (they still are).

**Verify**: `grep -n "AppStateContext.test" docs/TECHNICAL_DESIGN.md` → ≥1 match.

## Test plan

This plan *is* the test plan — 12+ new tests as specified in Steps 2–5,
modeled structurally on `src/lib/importExport.test.ts`. Final check:

`yarn test` → 2 old files + 1 new file, all passing (≥22 tests total).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `yarn test` exits 0; `src/context/AppStateContext.test.tsx` exists and
      contains ≥12 `it(` cases covering bootstrap, legacy import, reorder,
      move, cascade delete, and background-clear
- [ ] `yarn tsc -b` exits 0
- [ ] `yarn lint` exits 0
- [ ] `src/context/AppStateContext.tsx` is unmodified **unless** the Step 5
      contingency fired (check `git diff --stat`)
- [ ] "Testing Focus" in `docs/TECHNICAL_DESIGN.md` reflects the new suite
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated (note whether the Step 5
      contingency fired)

## STOP conditions

Stop and report back (do not improvise) if:

- `rxdb/plugins/storage-memory` fails to import or behaves incompatibly with
  the schemas (e.g. errors about unsupported index types) — do not swap in
  `fake-indexeddb` or another storage on your own.
- The provider never flips `ready: true` under the memory storage after a
  reasonable `waitFor` timeout — the subscription timing assumptions may not
  hold outside Dexie; report rather than papering over with longer timeouts.
- The Step 5 contingency fix makes any *other* test fail (the
  `incrementalModify` rewrite would then be changing behavior beyond
  clearing).
- You find yourself wanting to modify `src/storage/db.ts` or the bootstrap
  effect to make tests pass.

## Maintenance notes

- Plans 003, 005, 006 extend this suite; keep `testDb.ts` and the
  `renderAppState` harness generic.
- The suite characterizes *current* behavior. If a test here fails after a
  future change, first ask "did I mean to change this behavior?" — these are
  regression tripwires, not specs handed down.
- Reviewers should scrutinize: that assertions check *persisted* data (via
  `testDb` queries), not only React state — the historical bugs were exactly
  in the state↔storage round trip.
- Deferred: drag-and-drop interaction tests (browser-only, per the
  documented gotcha) and broken-image fallback DOM tests.
