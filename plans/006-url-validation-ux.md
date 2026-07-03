# Plan 006: Validate URL fields in the edit dialogs with inline feedback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- src/components/EditDialog.tsx src/components/LinkEditModal.tsx src/components/DashboardEditModal.tsx src/lib/url.ts docs/PRD.md`
> Plan 003 added `isSafeHref` to `src/lib/url.ts` — that drift is expected
> and required. Any other structural drift from the excerpts below is a STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-harden-import.md (uses `isSafeHref`), plans/002-characterization-tests.md (test harness)
- **Category**: direction (PRD Open Item, now decided)
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

`docs/PRD.md`'s Open Items asks "whether link/dashboard fields should get
client-side validation beyond URL scheme normalization (currently none is
enforced)". The maintainer has decided: yes, for **URL fields only**. Today
a garbage URL saves silently and produces a tile that navigates nowhere (and
after plan 003's render guard, an unsafe-scheme URL produces a tile that
silently doesn't navigate at all — visible feedback should exist at entry
time instead). Titles and dashboard names stay unvalidated (empty title is
explicitly supported: it displays as "Untitled").

## Current state

- `src/components/EditDialog.tsx` — shared modal shell. The save path:

  ```ts
  interface EditDialogProps {
    title: string
    onSave: () => Promise<void> | void
    onClose: () => void
    children: React.ReactNode
  }

  export function EditDialog({ title, onSave, onClose, children }: EditDialogProps) {
    async function handleSave() {
      await onSave()
      onClose()
    }
  ```

  i.e. saving always closes; there is no way for a field-set to veto the
  close.

- `src/components/LinkEditModal.tsx` — three fields (Title, URL, Background
  image URL), each an `Input` inside a `Field` + `FieldLabel`. Save:

  ```tsx
  onSave={() =>
    updateLink(link.id, { title, url, backgroundImageUrl: backgroundImageUrl || undefined })
  }
  ```

- `src/components/DashboardEditModal.tsx` — same pattern: Name + Background
  image URL; save calls `updateDashboard(dashboard.id, { name,
  backgroundImageUrl: backgroundImageUrl || undefined })`.
- `src/components/ui/field.tsx` — exports `FieldError` (verified): renders
  `children` in a `role="alert"` div styled `text-destructive`; renders
  nothing when it has no content. The `Field` wrapper supports a
  `data-invalid` attribute (`data-[invalid=true]:text-destructive` in its
  cva class).
- `src/lib/url.ts` — `normalizeUrl` (prepends `https://` to scheme-less
  input; empty string stays empty) and, post-plan-003, `isSafeHref(url)`
  (true only for parseable `http:`/`https:` URLs).
- Relevant PRD contract (must keep): "If a target URL or background image
  URL is entered without a scheme (e.g. `github.com`), `https://` is
  auto-prepended when it's saved. An empty background-image field stays
  empty (this is how a user clears a previously-set background image)."
  So: validate the *normalized* value, and an empty background field is
  always valid.

## Commands you will need

| Purpose   | Command       | Expected on success |
|-----------|---------------|---------------------|
| Tests     | `yarn test`   | all pass            |
| Typecheck | `yarn tsc -b` | exit 0              |
| Lint      | `yarn lint`   | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `src/components/EditDialog.tsx`
- `src/components/LinkEditModal.tsx`
- `src/components/DashboardEditModal.tsx`
- `src/components/LinkEditModal.test.tsx` (create)
- `docs/PRD.md` (Open Items + URL-handling note)

**Out of scope** (do NOT touch):
- Title / dashboard-name validation — explicitly stays permissive.
- `src/lib/url.ts` — consume `isSafeHref`, don't change it.
- Reachability checks, favicon fetching, any network validation.
- `src/components/ui/*` primitives — `FieldError` already exists; no
  primitive changes.

## Git workflow

- Branch: `advisor/006-url-validation-ux`
- Commit style: imperative, e.g. `Validate URL fields in edit dialogs`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Let onSave veto the close

In `src/components/EditDialog.tsx`, change the `onSave` type to
`() => Promise<boolean | void> | boolean | void` and the handler to:

```ts
async function handleSave() {
  const result = await onSave()
  if (result !== false) onClose()
}
```

(Returning nothing keeps today's behavior; returning `false` keeps the
dialog open. Cancel/outside-click/Escape behavior is untouched.)

**Verify**: `yarn tsc -b` → exit 0 (existing modals still typecheck — their
`void` returns remain valid).

### Step 2: Validate in LinkEditModal

In `src/components/LinkEditModal.tsx`:

- State: `const [urlError, setUrlError] = useState<string | null>(null)` and
  `const [backgroundError, setBackgroundError] = useState<string | null>(null)`.
- Replace `onSave` with:

  ```tsx
  onSave={async () => {
    const normalizedUrl = normalizeUrl(url)
    const nextUrlError = isSafeHref(normalizedUrl)
      ? null
      : 'Enter a valid URL (http or https).'
    const nextBackgroundError =
      backgroundImageUrl.trim() === '' || isSafeHref(normalizeUrl(backgroundImageUrl))
        ? null
        : 'Enter a valid image URL, or leave this empty.'
    setUrlError(nextUrlError)
    setBackgroundError(nextBackgroundError)
    if (nextUrlError || nextBackgroundError) return false
    await updateLink(link.id, {
      title,
      url,
      backgroundImageUrl: backgroundImageUrl || undefined,
    })
  }}
  ```

  (Pass the raw `url` through to `updateLink` as today — it re-normalizes on
  save; validation and persistence must agree, which they do because both
  run `normalizeUrl` first.)
- On the URL `Field`, add `data-invalid={urlError ? true : undefined}` and
  render `<FieldError>{urlError}</FieldError>` after the `Input` (import
  `FieldError` from `./ui/field`). Same for the background field with
  `backgroundError`.

**Verify**: `yarn tsc -b && yarn lint` → exit 0.

### Step 3: Validate in DashboardEditModal

Same pattern for the single Background image URL field in
`src/components/DashboardEditModal.tsx` (empty = valid; name field gets no
validation).

**Verify**: `yarn tsc -b && yarn lint` → exit 0.

### Step 4: Component tests

Create `src/components/LinkEditModal.test.tsx`. Reuse plan 002's provider
harness pieces (`createTestDatabase`, the `vi.mock('../storage/db', ...)`
factory — copy the small mock block; keep the seeded link fixed, e.g. `l1`
on dashboard `d1`). Render `<LinkEditModal link={...} onClose={vi.fn()} />`
inside `AppStateProvider`, drive it with `@testing-library/user-event`
(installed):

1. **rejects an invalid URL and keeps the dialog open** — clear the URL
   input, type `ht tp://broken`, click `Save`; expect the alert text
   `Enter a valid URL (http or https).` visible, `onClose` not called, and
   the persisted link's `url` unchanged in `testDb`.
2. **accepts a scheme-less URL** — type `github.com`, Save; `onClose`
   called; persisted url is `https://github.com`.
3. **empty background field is valid** — clear background, Save; no error,
   `onClose` called.

**Verify**: `yarn test` → all pass, 3 new tests.

### Step 5: Update the PRD

In `docs/PRD.md`:
1. In "URL handling", add: URL fields are validated on save — the normalized
   value must be a parseable `http(s)` URL; invalid values show an inline
   error and block the save (Cancel/dismiss still discards freely).
2. In "Open Items for Future Consideration", rewrite the validation bullet:
   URL validation is now enforced; titles/names intentionally remain
   free-form.

**Verify**: `grep -n "inline error" docs/PRD.md` → ≥1 match.

## Test plan

Step 4's three cases; pattern: plan 002's `AppStateContext.test.tsx` for the
provider/db harness, plus `user-event` for interaction. `yarn test` → all
pass.

## Done criteria

- [ ] `yarn tsc -b`, `yarn lint`, `yarn test` all exit 0
- [ ] `grep -n "FieldError" src/components/LinkEditModal.tsx src/components/DashboardEditModal.tsx` → matches in both
- [ ] Saving an invalid URL keeps the dialog open with a visible error (test 1)
- [ ] Saving `github.com` still works and persists `https://github.com` (test 2)
- [ ] `docs/PRD.md` reflects the decided validation behavior
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `isSafeHref` does not exist in `src/lib/url.ts` (plan 003 not executed).
- `FieldError` is not exported from `src/components/ui/field.tsx`.
- Interacting with the Base UI dialog in jsdom fails in ways unrelated to
  this change (portal/focus errors on `Save` clicks) after one reasonable
  fix attempt — component-testing Base UI dialogs may need setup this plan
  didn't anticipate; report what you hit.

## Maintenance notes

- The `onSave → false` veto is now part of `EditDialog`'s contract; any new
  modal built on it can opt into validation the same way.
- Reviewer focus: validation must run on the *normalized* value — rejecting
  raw `github.com` would break the PRD's auto-prepend promise.
- Deferred: `onChange`-time (as-you-type) validation; save-time only keeps
  the dialogs quiet while typing.
