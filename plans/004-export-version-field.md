# Plan 004: Version the export format and document the schema-migration path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- src/types/index.ts src/lib/importExport.ts src/lib/importExport.test.ts docs/DATA_FORMATS.md docs/TECHNICAL_DESIGN.md`
> Plan 003 intentionally rewrote `importExport.ts` — this plan builds on the
> post-003 code. If plan 003 is NOT marked DONE in `plans/README.md`, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-harden-import.md
- **Category**: migration
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

Both `docs/DATA_FORMATS.md` ("Versioning note") and `docs/TECHNICAL_DESIGN.md`
("Open Items") flag the same gap: the export format has no version field, so
the first time the shape changes there will be no reliable way to tell old
files from new ones. Files real users have already downloaded live forever.
Adding `"version": 1` now — and treating its absence as version 0, which is
shape-identical — costs a few lines; retrofitting it after a shape change
costs a heuristic. The same docs also defer the RxDB collection-schema
migration strategy; this plan documents that process so the next schema
change doesn't ship without one.

## Current state

- `src/types/index.ts` — `ExportedState`:

  ```ts
  export interface ExportedState {
    dashboards: Dashboard[]
    links: Link[]
    activeDashboardId: string | null
  }
  ```

- `src/lib/importExport.ts` (post-plan-003) — `serializeState` returns
  `{ dashboards, links, activeDashboardId }`; `isExportedState` is a strict
  structural validator; `sanitizeExportedState` copies known fields.
- `docs/DATA_FORMATS.md` — "Versioning note" says: "There is currently no
  explicit schema-version field in this format. A reimplementation that
  changes the shape should either keep it backward-readable or add an
  explicit version marker and handle its absence as 'version 0' (this
  shape)." The JSON example at the top of "Current export format" has no
  `version` key.
- `docs/TECHNICAL_DESIGN.md` — "Open Items" first bullet: "Exact RxDB schema
  versioning/migration strategy as the data model evolves … The current
  export format also has no explicit version field…"
- RxDB collection schemas (`src/storage/schemas.ts`) are both `version: 0`.
  **No RxDB schema change happens in this plan** — the export-format version
  and the RxDB schema version are related but distinct concepts; keep them
  distinct in the docs you write.

## Commands you will need

| Purpose   | Command       | Expected on success |
|-----------|---------------|---------------------|
| Tests     | `yarn test`   | all pass            |
| Typecheck | `yarn tsc -b` | exit 0              |
| Lint      | `yarn lint`   | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/types/index.ts`
- `src/lib/importExport.ts`
- `src/lib/importExport.test.ts`
- `docs/DATA_FORMATS.md`
- `docs/TECHNICAL_DESIGN.md`

**Out of scope** (do NOT touch):
- `src/storage/schemas.ts` — RxDB schemas stay `version: 0`; no
  `migrationStrategies` code is added now.
- `src/context/AppStateContext.tsx`, `src/components/ImportExportBar.tsx` —
  the version flows through `serializeState`/`isExportedState`; no caller
  changes needed.

## Git workflow

- Branch: `advisor/004-export-version-field`
- Single commit is fine: `Version the export format`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the version to the type and serializer

In `src/types/index.ts`, add an optional member to `ExportedState`:

```ts
export interface ExportedState {
  version?: number
  dashboards: Dashboard[]
  links: Link[]
  activeDashboardId: string | null
}
```

(Optional because imported files from before this change lack it.)

In `src/lib/importExport.ts`:

```ts
export const CURRENT_EXPORT_VERSION = 1
```

and make `serializeState` return `{ version: CURRENT_EXPORT_VERSION, dashboards, links, activeDashboardId }`.

**Verify**: `yarn tsc -b` → exit 0.

### Step 2: Teach the validator about versions

In `isExportedState`, after the object/array checks, add:

- `version` absent → acceptable (version 0, same shape).
- `version` present but not a number → reject.
- `version` a number greater than `CURRENT_EXPORT_VERSION` → return `false`
  (a type guard can't throw a tailored error; a future-versioned file
  therefore surfaces as `importState`'s existing `Unrecognized import file
  format.` error — acceptable for now, and noted in the Step 3 docs edit so
  a future format bump improves the message).

Also extend `sanitizeExportedState` to strip `version` from its output —
only files carry the marker, never the in-app state handed to `bulkUpsert`.

**Verify**: `yarn test src/lib/importExport.test.ts` → all pass after Step 4's
new tests are added (write them now if convenient).

### Step 3: Update the docs

`docs/DATA_FORMATS.md`:
1. Add `"version": 1,` as the first key of the current-format JSON example.
2. Add a `version` row to the "Top-level" field table: number, optional on
   read ("absent = version 0, identical shape"), always written as `1`.
3. Replace the "Versioning note" paragraph: the format now carries an
   explicit version; absence means version 0; readers must reject versions
   they don't understand (currently surfaced as an unrecognized-format
   error).

`docs/TECHNICAL_DESIGN.md`:
1. In "Open Items", trim the first bullet: the export-version half is done;
   what remains open is defining concrete `migrationStrategies` when the
   RxDB schemas first change.
2. Add a short subsection (e.g. under "Data Model") titled "Schema
   versioning" stating: RxDB collection schemas are at `version: 0`; any
   schema change must bump the collection's `version` and ship a
   `migrationStrategies` entry per version step (RxDB runs them on first
   open after upgrade); the export-format `version` (in
   `lib/importExport.ts`) is independent and only changes when the *file*
   shape changes.

**Verify**: `grep -n '"version": 1' docs/DATA_FORMATS.md` → ≥1 match;
`grep -n "Schema versioning" docs/TECHNICAL_DESIGN.md` → 1 match.

### Step 4: Tests

In `src/lib/importExport.test.ts` add:

- `serializeState` output includes `version: 1` (equals
  `CURRENT_EXPORT_VERSION`).
- `isExportedState` accepts a valid file with no `version` (already covered
  by existing cases — keep them green).
- `isExportedState` accepts `version: 1`, rejects `version: '1'` and
  `version: 2`.
- `sanitizeExportedState` output has no `version` property.

**Verify**: `yarn test` → all pass.

## Test plan

Covered in Step 4; pattern: existing blocks in
`src/lib/importExport.test.ts`. `yarn test` → all pass, ≥4 new cases.

## Done criteria

- [ ] `yarn tsc -b`, `yarn lint`, `yarn test` all exit 0
- [ ] `grep -n "CURRENT_EXPORT_VERSION" src/lib/importExport.ts` → ≥2 matches
- [ ] Exporting (via `serializeState` unit test) produces `version: 1`
- [ ] `docs/DATA_FORMATS.md` example and table include `version`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 003 is not DONE (this plan edits the validator 003 wrote).
- `serializeState` or `isExportedState` in the live code differ structurally
  from what plan 003 specified (drift beyond the expected).

## Maintenance notes

- When the file shape next changes: bump `CURRENT_EXPORT_VERSION`, keep
  readers for all older versions (0 and 1 are identical), and replace the
  reject-on-newer behavior with a clearer error message.
- Reviewer focus: the version must be *optional on read, mandatory on
  write* — a required `version` in the type would break importing every
  file users exported before this change.
