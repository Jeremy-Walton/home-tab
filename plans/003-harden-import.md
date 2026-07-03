# Plan 003: Validate imported files, block unsafe URL schemes, and surface import results to the user

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- src/lib/ src/context/ src/components/ImportExportBar.tsx src/components/LinkTile.tsx docs/DATA_FORMATS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Plan 002 legitimately may have
> touched `AppStateContext.tsx`'s `updateDashboard`/`updateLink` — that
> specific drift is expected and fine.)

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes the import path — the app's only data-recovery mechanism)
- **Depends on**: plans/002-characterization-tests.md
- **Category**: security / bug
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

This app has no backend; export/import **is** the entire data-safety story.
Today that path has three defects:

1. **No validation.** `isExportedState` only checks that `dashboards` and
   `links` keys *exist* — `{"dashboards": 1, "links": 2}` passes, and
   malformed dashboard/link objects are bulk-written into the persistent
   store unchecked (RxDB runs no schema validation without a dev-mode/
   validation plugin, which this app doesn't load).
2. **Silent failures.** RxDB's `bulkInsert`/`bulkUpsert` **do not throw** on
   per-document failures — they resolve to `{ success, error }` (verified in
   the installed rxdb 17's `rx-collection.d.ts:107,124`). The current code
   ignores that result. And `ImportExportBar.handleImportFile` has no
   try/catch and no UI feedback of any kind — a corrupt file, an
   unrecognized format (which `importState` throws for), or a JSON parse
   error all produce *nothing visible*; the rejection dies unhandled.
3. **Unsafe URL schemes.** The current export format is imported without any
   URL normalization (documented as edit-save-time only), so a shared or
   tampered export file can place a `javascript:`-scheme string directly
   into `link.url`, which `LinkTile.tsx` renders as `<a href={link.url}>` —
   clicking that tile executes script in the app's origin. Even the
   edit-save path's `normalizeUrl` passes through any scheme written with
   `://`.

The fix: strict structural validation, URL sanitization at import time, a
scheme allowlist (`http:`/`https:`) enforced at render time as
defense-in-depth, error checking on bulk writes, and a success/error dialog.

## Current state

- `src/lib/url.ts` — the whole file:

  ```ts
  const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

  export function normalizeUrl(input: string): string {
    const trimmed = input.trim()
    if (trimmed === '') return trimmed
    return SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`
  }
  ```

- `src/lib/importExport.ts` — `isExportedState` (lines 48–55):

  ```ts
  export function isExportedState(data: unknown): data is ExportedState {
    return (
      typeof data === 'object' &&
      data !== null &&
      'dashboards' in data &&
      'links' in data
    )
  }
  ```

  Also in this file: `isLegacyState`, `mapLegacyState` (maps legacy blobs;
  it already runs `normalizeUrl` on `link.url` but **not** on `link.image`
  → `backgroundImageUrl`), `serializeState`.

- `src/context/AppStateContext.tsx` — `importState` (lines 253–276):

  ```ts
  async function importState(data: unknown) {
    if (!db) return

    if (isLegacyState(data)) {
      const nextOrder =
        dashboards.length === 0 ? 0 : Math.max(...dashboards.map((d) => d.order)) + 1
      const { dashboard, links: importedLinks } = mapLegacyState(data, nextOrder)
      await db.dashboards.insert(dashboard)
      await db.links.bulkInsert(importedLinks)
      setActiveDashboardId(dashboard.id)
      return
    }

    if (isExportedState(data)) {
      await db.dashboards.bulkUpsert(data.dashboards)
      await db.links.bulkUpsert(data.links)
      if (data.activeDashboardId) {
        setActiveDashboardId(data.activeDashboardId)
      }
      return
    }

    throw new Error('Unrecognized import file format.')
  }
  ```

- `src/context/app-state-context.ts` — holds the `AppStateValue` type whose
  `importState` member is currently typed `(data: unknown) => Promise<void>`.
- `src/components/ImportExportBar.tsx` — `handleImportFile` (lines 22–26):

  ```ts
  async function handleImportFile(file: File) {
    const text = await file.text()
    const data = JSON.parse(text)
    await importState(data)
  }
  ```

- `src/components/LinkTile.tsx` — the tile anchor (lines 61–65):

  ```tsx
  <a
    href={link.url}
    draggable={false}
    className="absolute inset-0 flex items-end p-2"
  >
  ```

- `src/components/ConfirmDialog.tsx` — the exemplar for composing an
  alert-dialog from the `src/components/ui/alert-dialog.tsx` primitives.
  **Base UI gotcha (quoted from `docs/TECHNICAL_DESIGN.md`, must honor):**

  > `AlertDialogAction` renders a plain `Button` and does **not** auto-close
  > the dialog the way Radix's `Action` part did … any new
  > `AlertDialogAction` consumer must close the dialog itself.

- Wire-format contract: `docs/DATA_FORMATS.md`. Required fields —
  dashboards: `id` (string), `name` (string), `order` (number), `createdAt`
  (number); links: `id`, `dashboardId`, `title`, `url` (strings), `order`
  (number); optional `backgroundImageUrl` on both; top-level
  `activeDashboardId` string|null. It also states: "Otherwise it's not a
  recognized file; **reject with an error rather than guessing**" — this
  plan implements exactly that. One sentence there becomes stale and must be
  updated (Step 6): "normalization happens at edit-save time, not at
  import/export time."
- Test conventions: explicit `import { describe, expect, it } from 'vitest'`;
  see `src/lib/importExport.test.ts`. Plan 002 added
  `src/context/AppStateContext.test.tsx` with a `testDb` harness — extend it.

## Commands you will need

| Purpose   | Command       | Expected on success |
|-----------|---------------|---------------------|
| Tests     | `yarn test`   | all pass            |
| Typecheck | `yarn tsc -b` | exit 0              |
| Lint      | `yarn lint`   | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/url.ts`, `src/lib/url.test.ts`
- `src/lib/importExport.ts`, `src/lib/importExport.test.ts`
- `src/context/AppStateContext.tsx` (the `importState` function only)
- `src/context/app-state-context.ts` (the `importState` signature only)
- `src/context/AppStateContext.test.tsx` (extend)
- `src/components/ImportExportBar.tsx`
- `src/components/LinkTile.tsx` (the anchor `href` only)
- `docs/DATA_FORMATS.md` (two focused edits, Step 6)

**Out of scope** (do NOT touch, even though they look related):
- `normalizeUrl`'s behavior — leave it exactly as is; its 5 existing tests
  must pass unchanged. Safety comes from the new `isSafeHref` + render guard,
  not from changing normalization semantics.
- The bootstrap/legacy auto-import effect in `AppStateContext.tsx` — plan
  005 touches it; here you only change `importState`.
- The export side (`exportState`, `serializeState`, download logic) — plan
  004 versions the format; don't pre-empt it.
- `DashboardGrid.tsx` / dashboard background rendering — CSS
  `background-image` cannot execute script; no change needed.
- Adding a toast library — feedback uses the existing alert-dialog
  primitives.

## Git workflow

- Branch: `advisor/003-harden-import`
- Commits per logical unit (`Add isSafeHref`, `Validate and sanitize import`,
  `Surface import results`), imperative style.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a scheme allowlist helper

In `src/lib/url.ts`, add:

```ts
export function isSafeHref(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
```

In `src/lib/url.test.ts`, add a `describe('isSafeHref', ...)` block:
accepts `https://example.com` and `http://example.com`; rejects a
`javascript:`-scheme value (use a harmless one like `'javascript:void(0)'`),
a `data:`-scheme value, an unparseable string (`'not a url'`), and `''`.

**Verify**: `yarn test src/lib/url.test.ts` → all pass.

### Step 2: Strict validation + sanitization in importExport.ts

Replace `isExportedState` with a strict structural validator and add a
sanitizer. Target shape:

```ts
function isDashboardRecord(value: unknown): value is Dashboard {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === 'string' && d.id !== '' &&
    typeof d.name === 'string' &&
    typeof d.order === 'number' && Number.isFinite(d.order) &&
    typeof d.createdAt === 'number' &&
    (d.backgroundImageUrl === undefined || typeof d.backgroundImageUrl === 'string')
  )
}

function isLinkRecord(value: unknown): value is Link {
  if (typeof value !== 'object' || value === null) return false
  const l = value as Record<string, unknown>
  return (
    typeof l.id === 'string' && l.id !== '' &&
    typeof l.dashboardId === 'string' && l.dashboardId !== '' &&
    typeof l.order === 'number' && Number.isFinite(l.order) &&
    typeof l.title === 'string' &&
    typeof l.url === 'string' &&
    (l.backgroundImageUrl === undefined || typeof l.backgroundImageUrl === 'string')
  )
}

export function isExportedState(data: unknown): data is ExportedState {
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  if (!Array.isArray(candidate.dashboards) || !Array.isArray(candidate.links)) return false
  if (
    candidate.activeDashboardId !== undefined &&
    candidate.activeDashboardId !== null &&
    typeof candidate.activeDashboardId !== 'string'
  ) return false
  return (
    candidate.dashboards.every(isDashboardRecord) &&
    candidate.links.every(isLinkRecord)
  )
}

/**
 * Copies only the known fields (imported files may carry extras that would
 * otherwise be persisted verbatim) and normalizes every URL field.
 */
export function sanitizeExportedState(state: ExportedState): ExportedState {
  const dashboards: Dashboard[] = state.dashboards.map((d) => ({
    id: d.id,
    name: d.name,
    order: d.order,
    createdAt: d.createdAt,
    ...(d.backgroundImageUrl ? { backgroundImageUrl: normalizeUrl(d.backgroundImageUrl) } : {}),
  }))
  const links: Link[] = state.links.map((l) => ({
    id: l.id,
    dashboardId: l.dashboardId,
    order: l.order,
    title: l.title,
    url: normalizeUrl(l.url),
    ...(l.backgroundImageUrl ? { backgroundImageUrl: normalizeUrl(l.backgroundImageUrl) } : {}),
  }))
  return {
    dashboards,
    links,
    activeDashboardId:
      typeof state.activeDashboardId === 'string' ? state.activeDashboardId : null,
  }
}
```

Also in `mapLegacyState`, normalize the image field:
`backgroundImageUrl: link.image ? normalizeUrl(link.image) : undefined`
(and same for the dashboard's `legacy.backgroundUrl`).

Note the format-detection order contract from `docs/DATA_FORMATS.md`: a
`dashboards` key → current format; else `links`/`backgroundUrl` → legacy.
The existing tests at `src/lib/importExport.test.ts:16–24` (empty-array
export accepted, legacy shape rejected) must still pass.

Extend `src/lib/importExport.test.ts`:
- `isExportedState` rejects `{ dashboards: 1, links: 2 }`.
- rejects a file whose link is missing `url`.
- rejects `{ dashboards: [], links: [{...valid}], activeDashboardId: 42 }`.
- still accepts a valid file without `activeDashboardId` (older hand-crafted
  files) — treated as `null` by the sanitizer.
- `sanitizeExportedState` prepends `https://` to a scheme-less link url and
  drops unknown extra fields (assert `not.toHaveProperty('extra')`).
- `mapLegacyState` normalizes a scheme-less `image` field.

**Verify**: `yarn test src/lib/importExport.test.ts` → all pass.

### Step 3: Make importState validate, check bulk results, and report a summary

Define the summary type in `src/context/app-state-context.ts` (exported):

```ts
export interface ImportSummary {
  dashboards: number
  links: number
}
```

and change the `importState` member of `AppStateValue` to
`(data: unknown) => Promise<ImportSummary>`.

In `src/context/AppStateContext.tsx`, rework `importState`:

- Legacy branch: unchanged logic, but check the `bulkInsert` result's
  `error` array (see below) and `return { dashboards: 1, links: importedLinks.length }`.
- Current-format branch: `const clean = sanitizeExportedState(data)`, then
  bulk-upsert `clean.dashboards` / `clean.links`, then:

  ```ts
  const failed = dashboardResult.error.length + linkResult.error.length
  if (failed > 0) {
    throw new Error(`Import finished with ${failed} item(s) that could not be written.`)
  }
  return { dashboards: clean.dashboards.length, links: clean.links.length }
  ```

- Unrecognized: keep `throw new Error('Unrecognized import file format.')`.
- The `if (!db) return` guard must now `throw new Error('The database is not ready yet.')`
  instead of silently returning (the signature promises a summary).

**Verify**: `yarn tsc -b` → exit 0 (this catches any missed signature use).

### Step 4: Surface success/failure in ImportExportBar

In `src/components/ImportExportBar.tsx`:

- Add local state: `const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null)`.
- Rework `handleImportFile`:

  ```ts
  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('That file is not valid JSON.')
      }
      const summary = await importState(data)
      setFeedback({
        title: 'Import complete',
        message: `Imported ${summary.dashboards} dashboard(s) and ${summary.links} link(s).`,
      })
    } catch (error) {
      setFeedback({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Could not import that file.',
      })
    }
  }
  ```

- Render the feedback dialog after the hidden `<input>`, composed from the
  `ui/alert-dialog` primitives **modeled on `src/components/ConfirmDialog.tsx`**
  (same imports, same `open`/`onOpenChange` pattern), with the title as
  `AlertDialogTitle` (not `sr-only` here — it carries meaning), the message
  as `AlertDialogDescription`, and a single `AlertDialogAction` labeled
  `OK` whose `onClick` calls `setFeedback(null)`. Per the Base UI gotcha
  quoted in "Current state", the action does NOT auto-close — the explicit
  `setFeedback(null)` is what closes it. `onOpenChange={(open) => !open && setFeedback(null)}`
  handles Escape/outside-click.

**Verify**: `yarn tsc -b && yarn lint` → exit 0.

### Step 5: Render-time href guard in LinkTile

In `src/components/LinkTile.tsx`, import `isSafeHref` from `../lib/url` and
change the anchor to:

```tsx
<a
  href={isSafeHref(link.url) ? link.url : undefined}
  ...
```

(An anchor with no `href` does not navigate — pre-existing bad data in a
user's store is neutralized too, not just future imports.)

Extend `src/context/AppStateContext.test.tsx` (using plan 002's harness)
with an integration case: `importState` on a valid file persists dashboards
and links and resolves to the correct summary; `importState` on
`{ dashboards: 'x', links: [] }` rejects with `Unrecognized import file
format.` and writes nothing (assert collection counts unchanged).

**Verify**: `yarn test` → all pass.

### Step 6: Update DATA_FORMATS.md

Two focused edits:

1. In the `links[].url` row of the current-format table, replace
   "normalization happens at edit-save time, not at import/export time" with
   a note that import now normalizes URL fields and that only `http(s)`
   URLs are rendered as clickable hrefs.
2. In "Import behavior", add one sentence: files failing structural
   validation are rejected with an error before anything is written.

**Verify**: `grep -n "not at import/export time" docs/DATA_FORMATS.md` → 0 matches.

## Test plan

- `src/lib/url.test.ts` — `isSafeHref` cases (Step 1).
- `src/lib/importExport.test.ts` — strict-validator + sanitizer cases
  (Step 2); all pre-existing cases untouched and passing.
- `src/context/AppStateContext.test.tsx` — import round-trip + rejection
  cases (Step 5), following the harness from plan 002.
- Pattern: `src/lib/importExport.test.ts`.
- `yarn test` → all pass, ≥10 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `yarn tsc -b`, `yarn lint`, `yarn test` all exit 0
- [ ] `grep -n "isSafeHref" src/components/LinkTile.tsx` → 1 match
- [ ] `grep -n "sanitizeExportedState" src/context/AppStateContext.tsx` → ≥1 match
- [ ] `grep -n "\.error" src/context/AppStateContext.tsx` → matches in
      `importState` (bulk results are checked)
- [ ] `grep -n "catch" src/components/ImportExportBar.tsx` → ≥1 match, and a
      feedback dialog is rendered
- [ ] Existing tests from before this plan all still pass unmodified
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 002's suite is not present (`src/context/AppStateContext.test.tsx`
  missing) — execute 002 first; this plan's integration tests depend on its
  harness.
- The installed rxdb's `bulkUpsert`/`bulkInsert` do not return
  `{ success, error }` (typecheck will tell you) — the error-surfacing
  design assumption is wrong; report instead of adapting.
- Any pre-existing test needs *modification* (not just addition) to pass —
  that means you changed observable behavior beyond the plan's intent.
- You find yourself changing `normalizeUrl` semantics.

## Maintenance notes

- Plan 004 adds a `version` field to the export format; its validator change
  goes into the `isExportedState` written here.
- The render guard means a link whose URL was imported before this plan and
  has an unsafe scheme silently becomes non-clickable; its edit dialog still
  shows the raw value, and plan 006 adds visible validation there.
- Reviewer focus: the sanitizer must copy *only* known fields — spreading
  the source object (`...d`) would silently reintroduce the
  persist-unknown-fields problem.
- Deferred deliberately: schema validation inside RxDB itself (dev-mode /
  ajv plugin) — heavier dependency, redundant once imports are the only
  unvalidated entry point and are now validated.
