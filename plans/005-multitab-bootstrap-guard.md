# Plan 005: Guard the first-load bootstrap against concurrent tabs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- src/context/AppStateContext.tsx src/context/AppStateContext.test.tsx docs/TECHNICAL_DESIGN.md`
> Plans 002/003 legitimately touched these files. Read the live bootstrap
> effect and confirm it still matches the *shape* described below (pre-check
> → legacy import or Default creation); if it has been restructured beyond
> that, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches the bootstrap effect, historically the most timing-sensitive code in the app)
- **Depends on**: plans/002-characterization-tests.md
- **Category**: bug
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

This app is a browser **new-tab page** — being opened in several tabs nearly
simultaneously (e.g. session restore reopening a window) is its normal
operating condition, not an edge case. The first-load bootstrap has two
races across tabs:

1. Two fresh tabs both observe zero dashboards and both insert a "Default"
   dashboard (with different random ids) → the user permanently has two
   "Default" tabs.
2. Worse: two tabs both read the legacy `localStorage["state"]` blob before
   either deletes it → two "Imported" dashboards, every legacy link
   duplicated. The legacy migration is documented as "the primary safety net
   against data loss"; duplicating it undermines exactly the flow it
   protects.

The in-tab `bootstrapping` ref only guards re-entry within one tab. The fix
is a cross-tab mutex (the Web Locks API — supported in Chrome, this app's
only target) plus re-reading the decision inputs *inside* the lock, since
another tab may have bootstrapped while we waited.

## Current state

- `src/context/AppStateContext.tsx` — the bootstrap effect (lines 84–129 at
  planning commit). Key excerpt:

  ```ts
  const bootstrapping = useRef(false)
  useEffect(() => {
    if (!ready || !db) return
    if (bootstrapping.current) return

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw && dashboards.length > 0) return

    bootstrapping.current = true
    const database = db

    async function bootstrap() {
      if (legacyRaw) {
        try {
          const legacyData = JSON.parse(legacyRaw)
          if (isLegacyState(legacyData)) {
            const nextOrder =
              dashboards.length === 0 ? 0 : Math.max(...dashboards.map((d) => d.order)) + 1
            const { dashboard, links: importedLinks } = mapLegacyState(legacyData, nextOrder)
            await database.dashboards.insert(dashboard)
            await database.links.bulkInsert(importedLinks)
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            setActiveDashboardId(dashboard.id)
            return
          }
        } catch {
          // Malformed legacy data -- drop it below so we don't loop on it.
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }

      if (dashboards.length === 0) {
        const doc = await database.dashboards.insert({
          id: generateId(),
          name: 'Default',
          order: 0,
          createdAt: Date.now(),
        })
        setActiveDashboardId(doc.id)
      }
    }

    void bootstrap().finally(() => {
      bootstrapping.current = false
    })
  }, [ready, db, dashboards])
  ```

  Note it decides based on the **React-state snapshot** (`dashboards`) and a
  **pre-lock read** of `legacyRaw` — both stale by the time a competing tab
  finishes. Constants: `LEGACY_STORAGE_KEY = 'state'`,
  `ACTIVE_DASHBOARD_KEY = 'launch-tabs:activeDashboardId'`.

- The database is created with RxDB's default `multiInstance: true`
  (`src/storage/db.ts` passes no override), so once one tab writes, other
  tabs' subscriptions do see it — but only *after* their own bootstrap may
  already have raced ahead.

- Documented gotcha that must keep holding (from `docs/TECHNICAL_DESIGN.md`):

  > RxDB's reactive `find().$` can emit before persisted IndexedDB data has
  > actually loaded into the subscription. Don't treat "the database
  > connected" as "the data is ready" — wait for the *first real query
  > emission* before flipping a `ready` flag, or first-load bootstrap logic
  > … can misfire on every reload.

  Your change must not alter when `ready` flips or gate rendering on the
  lock.

- Test harness: `src/context/AppStateContext.test.tsx` +
  `src/test/testDb.ts` from plan 002 (`renderAppState`, mocked
  `getDatabase`, direct `testDb` queries). jsdom has **no**
  `navigator.locks`, so the code needs a fallback and the concurrency test
  needs a shim (Step 3).

## Commands you will need

| Purpose   | Command       | Expected on success |
|-----------|---------------|---------------------|
| Tests     | `yarn test`   | all pass            |
| Typecheck | `yarn tsc -b` | exit 0              |
| Lint      | `yarn lint`   | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/context/AppStateContext.tsx` (the bootstrap effect only)
- `src/context/AppStateContext.test.tsx` (extend)
- `docs/TECHNICAL_DESIGN.md` (note the lock in the bootstrap description)

**Out of scope** (do NOT touch):
- `src/storage/db.ts`, `multiInstance` settings, leader-election plugins —
  the Web Locks approach doesn't need them.
- The `ready`-flag logic and the RxDB subscriptions (lines 42–76) — the
  gotcha above; do not restructure.
- The other mutations (`addDashboard`, `reorderLinks`, …) — concurrent-tab
  hardening for ordinary edits is explicitly not in scope (last-write-wins
  is acceptable there).

## Git workflow

- Branch: `advisor/005-multitab-bootstrap-guard`
- Commit style: imperative, e.g. `Serialize first-load bootstrap across tabs`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a lock helper with a fallback

In `src/context/AppStateContext.tsx` (module scope, near `linksEqual`):

```ts
// Serializes first-load bootstrap across tabs (a new-tab app is routinely
// opened in several tabs at once). Falls back to running unlocked where the
// Web Locks API is unavailable (jsdom in tests).
function withBootstrapLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('launch-tabs:bootstrap', fn)
  }
  return fn()
}
```

(TypeScript's dom lib types `navigator.locks` as `LockManager`; no `any`
casts should be needed. If `tsc` disagrees, STOP — see STOP conditions.)

**Verify**: `yarn tsc -b` → exit 0.

### Step 2: Re-read decision inputs inside the lock

Rework the bootstrap effect so that everything decision-relevant is
re-derived *inside* the lock from the database and `localStorage` directly —
the React-state `dashboards` snapshot is only used for the cheap early-exit
pre-check. Target shape:

```ts
useEffect(() => {
  if (!ready || !db) return
  if (bootstrapping.current) return

  // Cheap pre-check on possibly-stale state; the authoritative re-check
  // happens inside the cross-tab lock.
  if (!localStorage.getItem(LEGACY_STORAGE_KEY) && dashboards.length > 0) return

  bootstrapping.current = true
  const database = db

  async function bootstrap() {
    // Re-read everything now that we hold the lock -- another tab may have
    // bootstrapped while we waited.
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    const existing = await database.dashboards.find().exec()

    if (legacyRaw) {
      try {
        const legacyData = JSON.parse(legacyRaw)
        if (isLegacyState(legacyData)) {
          const nextOrder =
            existing.length === 0 ? 0 : Math.max(...existing.map((d) => d.order)) + 1
          const { dashboard, links: importedLinks } = mapLegacyState(legacyData, nextOrder)
          await database.dashboards.insert(dashboard)
          await database.links.bulkInsert(importedLinks)
          localStorage.removeItem(LEGACY_STORAGE_KEY)
          setActiveDashboardId(dashboard.id)
          return
        }
      } catch {
        // Malformed legacy data -- drop it below so we don't loop on it.
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }

    if (existing.length === 0) {
      const doc = await database.dashboards.insert({
        id: generateId(),
        name: 'Default',
        order: 0,
        createdAt: Date.now(),
      })
      setActiveDashboardId(doc.id)
    }
  }

  void withBootstrapLock(bootstrap).finally(() => {
    bootstrapping.current = false
  })
}, [ready, db, dashboards])
```

Behavioral notes, all intentional:
- `existing` (fresh DB query) replaces every use of the `dashboards` state
  snapshot inside the function.
- A losing tab that finds the legacy key already gone and dashboards already
  present simply does nothing; its own `activeDashboardId` may be `null`,
  and the existing "keep the active dashboard valid" effect (lines 131–138)
  already repairs that.
- Preserve the existing comment block above the effect; extend it with one
  sentence about the cross-tab lock.

**Verify**: `yarn test` → all pass. **Every bootstrap test from plan 002
must pass unmodified** — this refactor must be behavior-preserving for a
single tab.

### Step 3: Concurrency test with a lock shim

jsdom lacks `navigator.locks`, so define a minimal serializing shim in the
test file (not in `src/test/setup.ts` — keep it local):

```ts
// Minimal Web Locks shim: serializes callbacks per lock name, which is the
// only property the bootstrap guard relies on.
function installLocksShim() {
  let queue: Promise<unknown> = Promise.resolve()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, fn: () => Promise<unknown>) => {
        const run = queue.then(fn)
        queue = run.catch(() => undefined)
        return run
      },
    },
  })
  return () => {
    delete (navigator as { locks?: unknown }).locks
  }
}
```

Add a `describe('bootstrap under concurrent tabs', ...)` block that installs
the shim in `beforeEach` (and removes it in `afterEach`), then:

1. **only one Default dashboard when two providers race** — render TWO
   independent provider trees against the same `testDb` (call
   `renderAppState()` twice before awaiting either); `waitFor` both ready;
   assert `await testDb.dashboards.find().exec()` has length 1.
2. **legacy state is imported exactly once when two providers race** — set
   the legacy key, render two providers; assert exactly one dashboard named
   `Imported`, the legacy links exist exactly once (count them), and
   `localStorage.getItem('state')` is `null`.

These fail against the pre-fix code (both providers insert) and pass with
the lock + in-lock re-read, which is exactly the point.

**Verify**: `yarn test` → all pass, including the two new concurrency cases.
As a sanity check, temporarily revert Step 2's re-read (keep the lock) and
confirm test 2 fails, then restore — the re-read, not just the lock, is
load-bearing. (Skip this sanity check if the operator asked for minimal
churn.)

### Step 4: Document it

In `docs/TECHNICAL_DESIGN.md`, in the "Import (legacy format, automatic)"
bullet under "Export / Import" (and/or the Known Gotchas RxDB entry if more
natural), add one or two sentences: the bootstrap runs under a Web Locks
mutex (`launch-tabs:bootstrap`) and re-reads `localStorage` + the dashboards
collection inside the lock, because multiple new-tab instances open
concurrently.

**Verify**: `grep -n "launch-tabs:bootstrap" docs/TECHNICAL_DESIGN.md` → ≥1 match.

### Step 5: Manual browser verification (report for the operator)

Automated coverage above uses a shim. Note in your final report that a real
two-tab check is worthwhile and describe it (the repo's `AGENTS.md` requires
browser verification for behavior like this; the operator may prefer to run
it themselves):

1. `yarn dev`; in Chrome DevTools → Application, delete the `launch-tabs`
   IndexedDB database and both `localStorage` keys.
2. Set `localStorage.state` to a small legacy blob (shape in
   `docs/DATA_FORMATS.md`, "Legacy format").
3. Duplicate the tab quickly (or restore a multi-tab session) so two
   instances load together; confirm exactly one "Imported" dashboard exists
   in both tabs.

## Test plan

Steps 2–3: all pre-existing bootstrap characterization tests pass
unmodified, plus 2 new concurrency tests using the locks shim. Pattern:
plan 002's suite in the same file. `yarn test` → all pass.

## Done criteria

- [ ] `yarn tsc -b`, `yarn lint`, `yarn test` all exit 0
- [ ] `grep -n "withBootstrapLock" src/context/AppStateContext.tsx` → ≥2 matches
- [ ] Inside `bootstrap()`, decisions use a fresh `dashboards.find().exec()`
      result, not the `dashboards` state variable (read the diff to confirm)
- [ ] Two new concurrency tests exist and pass
- [ ] Plan 002's bootstrap tests pass without modification
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated (note that manual two-tab
      verification is still pending, per Step 5)

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 002's suite is absent (execute 002 first).
- `navigator.locks` type errors under `yarn tsc -b` — do not add `any`
  casts; report the TS lib situation instead.
- Any pre-existing bootstrap test requires modification to pass.
- The concurrency tests are flaky (pass/fail across runs) — timing
  assumptions differ from the analysis; report rather than adding retries
  or timeouts.

## Maintenance notes

- If backend sync ever lands (see plan 008), bootstrap semantics change
  entirely — revisit this lock then.
- Reviewer focus: (a) the in-lock re-read is the actual fix — a lock around
  stale-snapshot decisions would still double-import; (b) `ready`-flag logic
  untouched.
- Deferred: cross-tab races on ordinary mutations (reorder in two tabs at
  once) — last-write-wins is acceptable and RxDB conflict handling covers
  document-level consistency.
