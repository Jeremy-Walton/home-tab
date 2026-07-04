# Launch Tabs — Data Interchange Formats

Companion to [PRD.md](./PRD.md). This is the exact, stack-agnostic contract
for the two file formats the app reads/writes, so that any reimplementation
stays compatible with files real users already have: exports produced by
this app, and legacy exports/localStorage data from the app it replaced.
Field names and types below are authoritative; match them exactly.

## Current export format

Produced by "Export," and the format "Import" expects unless it detects the
legacy shape instead (see below). A single JSON object, UTF-8 text, no
particular file extension required (the app names downloads
`launch-tabs-export.json`).

```json
{
  "version": 1,
  "dashboards": [
    {
      "id": "3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e",
      "name": "Default",
      "order": 0,
      "backgroundImageUrl": "https://example.com/bg.jpg",
      "createdAt": 1751500000000
    }
  ],
  "links": [
    {
      "id": "9f1e2d3c-4b5a-6978-8f9e-0a1b2c3d4e5f",
      "dashboardId": "3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e",
      "order": 0,
      "title": "GitHub",
      "url": "https://github.com",
      "backgroundImageUrl": "https://example.com/gh.png"
    }
  ],
  "activeDashboardId": "3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e"
}
```

### `dashboards[]`

| Field                | Type              | Required | Notes |
|----------------------|-------------------|----------|-------|
| `id`                 | string             | yes      | Unique across all dashboards. Any unique-string ID scheme works (the current app uses a UUID); a reimplementation is not required to match ID *format*, only uniqueness. |
| `name`               | string             | yes      | Display name. No length limit enforced; long names are truncated visually, not in storage. |
| `order`              | number             | yes      | Position among dashboards, ascending. Not required to be contiguous — only relative order matters. |
| `backgroundImageUrl` | string             | no       | Absolute URL. Omit the field (not an empty string) when there is no background. |
| `createdAt`          | number (ms epoch)  | yes      | Not currently shown in any UI; kept for potential future sorting/audit use. |

### `links[]`

| Field                | Type    | Required | Notes |
|----------------------|---------|----------|-------|
| `id`                 | string  | yes      | Unique across all links (not just within one dashboard). |
| `dashboardId`        | string  | yes      | Must match a `dashboards[].id` in the same file. |
| `order`              | number  | yes      | Position within its dashboard, ascending. Only relative order within the same `dashboardId` matters. |
| `title`              | string  | yes      | May be an empty string; the UI displays "Untitled" for an empty title, but the stored value stays empty. |
| `url`                | string  | yes      | Expected to already include a scheme (`https://…`). Import now also runs the same normalization on URL fields as edit-save time; only `http:`/`https:` URLs are rendered as clickable hrefs, so an unsafe scheme (e.g. `javascript:`) silently renders as non-clickable. |
| `backgroundImageUrl` | string  | no       | Absolute URL. Omit the field when there is no background. |

### Top-level

| Field               | Type            | Required | Notes |
|---------------------|-----------------|----------|-------|
| `version`           | number          | no       | Format version. Optional on read — absent means version 0, which is shape-identical to version 1 (the marker was added without changing the shape). The app always writes `1` (see `CURRENT_EXPORT_VERSION` in `src/lib/importExport.ts`). |
| `dashboards`        | array           | yes      | May be empty in a hand-crafted file, but the app itself never exports zero dashboards (it always has at least one). |
| `links`             | array           | yes      | May be empty. |
| `activeDashboardId` | string \| null  | yes      | Should match a `dashboards[].id` in the file. `null` is valid (no strong opinion on which dashboard becomes active after import). |

### Import behavior (upsert, not replace)

Importing this format **upserts by `id`**: any dashboard/link whose `id`
already exists locally is overwritten with the imported version; anything
with a new `id` is added. Existing local data whose `id`s are *not* present
in the imported file is left untouched — import is additive/merging, not a
full replace of local state. Re-importing the same file twice is safe
(idempotent). Files that fail structural validation (wrong types, missing
required fields) are rejected with an error before anything is written.

### Versioning note

The format carries an explicit `version` field, currently `1`. Absence of
the field means version 0, which is shape-identical to version 1 — the
marker was introduced without changing the shape. Readers must reject
versions they don't understand; today that surfaces as `importState`'s
generic "Unrecognized import file format." error rather than a
version-specific message (a future format bump should improve this). A
reimplementation that changes the shape again should bump the version and
either keep readers for older versions or document the break.

## Legacy format (pre-rewrite app)

The app this one replaced kept a single dashboard's worth of links as one
JSON blob under the browser's `localStorage` key **`state`** (not a
downloadable file, though the same shape was also used for that app's own
manual export/import if it had one). A from-scratch reimplementation must
still recognize and migrate this shape for users arriving from that app.

```json
{
  "links": [
    {
      "key": 1,
      "id": 0,
      "label": "GitHub",
      "url": "github.com",
      "image": "https://example.com/gh.png",
      "isDisabled": false,
      "color": "#ffffff"
    }
  ],
  "backgroundUrl": "https://example.com/bg.jpg"
}
```

| Legacy field         | Type    | Maps to                                    |
|----------------------|---------|---------------------------------------------|
| `links[].label`      | string  | new link's `title` (defaults to `""` if absent) |
| `links[].url`        | string  | new link's `url`, with `https://` prepended if the legacy value had no scheme |
| `links[].image`      | string  | new link's `backgroundImageUrl` (omitted if empty/absent) |
| `links[].key`        | number  | **dropped** — no equivalent |
| `links[].id`         | number  | **dropped** — a new unique `id` is generated instead |
| `links[].isDisabled` | boolean | **dropped** — no equivalent (all links are always "enabled") |
| `links[].color`      | string  | **dropped** — no equivalent |
| `backgroundUrl`      | string  | the one new dashboard's `backgroundImageUrl` (omitted if empty/absent) |

### Detecting which format a file/blob is

Given a parsed JSON object, decide legacy vs. current like this, in order:

1. If it has a `dashboards` key → **current format**.
2. Else if it has a `links` key or a `backgroundUrl` key → **legacy
   format**.
3. Otherwise it's not a recognized file; reject with an error rather than
   guessing.

### Migration result

Migrating a legacy blob (from either the automatic `localStorage` check or
a manually chosen legacy file) always produces exactly:

- **One new dashboard**, named literally `"Imported"`, `order` set to one
  past the current highest dashboard order (`0` if there were no dashboards
  yet), `backgroundImageUrl` from `backgroundUrl` (omitted if empty/absent).
- **One new link per legacy link entry**, in the same order as the legacy
  array (`order` = that index), each mapped per the table above.
- The active dashboard is switched to this new "Imported" dashboard.
- The original `localStorage["state"]` entry is deleted immediately after a
  successful automatic migration, so it is never re-imported on a later
  visit. (Not applicable to the manual-file-import path — there's no
  source entry to delete.)

### Automatic migration trigger (first-load check)

On every app load, before deciding whether to create a first-time "Default"
dashboard, check for a legacy blob at `localStorage["state"]`:

- If present and it parses as valid JSON matching the legacy shape above →
  run the migration described above, regardless of whether dashboards
  already exist (a user may have opened the app once before, creating an
  empty "Default", and only later have legacy data show up in the same
  browser profile).
- If present but **not** parseable/recognized → discard it (remove the
  `localStorage` key) rather than retrying forever on malformed data.
- If absent, and no dashboards exist yet → create the first-time empty
  "Default" dashboard instead (see PRD.md, "First-load / empty state").
- If absent, and dashboards already exist → do nothing.
