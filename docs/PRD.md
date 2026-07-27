# Launch Tabs — Product Requirements Document

## Overview

Launch Tabs is a static single-page app (SPA) that serves as a browser
new-tab dashboard for quickly navigating to favorite websites. It is paired
with an external browser extension (out of scope for this repo) that
redirects the browser's new-tab page to this SPA. It is loaded fresh each
time a new tab opens.

There is no backend. All data is persisted locally in the user's browser so
that the app works fully offline and requires no account or sign-in. The
persistence mechanism must be swappable for a real backend/sync service
later without changing any of the behavior described in this document.

This document is intentionally agnostic about *how* the app is built
(framework, language, styling system, storage engine). It describes the
product: the features it must have, and the UI structure and interactions
precisely enough that it could be rebuilt from scratch with different
technology and be indistinguishable to a user.

## Scope

- Chrome-first, desktop only. No mobile/touch support required.
- No search functionality (web search or link search) — purely a link grid.
- No global/app-wide settings panel, and no user-facing theme switcher.
- No backend/sync, but the persistence layer must not assume it is the
  permanent home of the data (see "Data & Storage").

## Application Shell

The app has exactly one screen, made of a persistent top bar and a main
content area below it that changes with the active dashboard.

- **Top bar** (always visible, full width, one row), left to right:
  1. App logo/wordmark (branding only, not interactive).
  2. The **dashboard tab strip** (see "Dashboards" below).
  3. Flexible empty space.
  4. A single icon button that opens the **import/export menu** (see "Data
     & Storage").
- **Main content area**: fills the remaining height below the top bar and
  renders the active dashboard's **link grid** (or its empty state), with
  that dashboard's own background image behind it if it has one.
- **Persistent footer overlays**: small, fixed, non-interactive-background
  strips shown above everything regardless of which dashboard is active.
  - Bottom-right: a copyright notice and a link inviting the user to
    install the (separate, third-party) browser extension that makes this
    app the browser's new-tab page. It never blocks clicks to the content
    behind it except on the link itself.
  - Bottom-left: a brief hint showing the `?` key and a short label
    inviting the user to open the keyboard-shortcuts overlay (see
    "Keyboard shortcuts").
- There is no sidebar, no header below the top bar, and no page navigation
  of any kind — switching dashboards is a same-page state change, not a
  different URL/route.

## Shared UI Patterns

A handful of interaction conventions repeat across dashboards and links;
recreating these consistently matters as much as the individual features:

- **Hover-to-reveal controls, no edit-mode toggle.** Editing affordances
  (an entity's options button, a dashboard's options button) are invisible
  until the user hovers the entity, then fade in. There is no separate mode
  to enter before editing/deleting/moving something.
- **The "options" menu.** Both dashboards and links expose their
  edit/delete/move actions through the same kind of small icon-only button
  (a vertical three-dot glyph) that opens a dropdown menu:
  - Links: **Edit**, **Move to…** (only present if at least one other
    dashboard exists, expands to a submenu listing every *other* dashboard
    by name), **Delete**.
  - Dashboards: **Edit**, **Delete** (disabled/greyed out when it is the
    only dashboard).
- **Confirmation dialogs.** Deleting a dashboard or a link always shows a
  small centered confirmation dialog first: a one-line message describing
  the consequence, a **Cancel** button, and a destructive **Delete**
  button. Nothing is deleted without this step.
- **Edit dialogs.** Editing a dashboard or a link opens a small centered
  modal: a title, one labeled text field per editable property stacked
  vertically, and a footer with **Cancel** and **Save**. Closing it any way
  other than Save (Cancel, clicking outside, Escape) discards the edits.
- **Tooltips on icon-only buttons.** Every button that has no visible text
  label (add-dashboard "+", the options "…" buttons, the import/export
  button) shows a short text tooltip identifying it after a brief hover (or
  keyboard focus) delay. Where a tooltip or hint references a keyboard
  shortcut, the modifier key's label is platform-aware (**⌥** on macOS,
  **Alt** elsewhere) — see "Keyboard shortcuts".
- **Silent fallback for broken images.** Anywhere a user-supplied image URL
  is rendered as a background (a link tile or a dashboard), a broken/404
  URL is never shown as a broken-image icon or error — it just falls back
  to a plain neutral background color, indistinguishable from "no image
  set" to the user.

## Dashboards

- A **dashboard** is a named collection of links, rendered as a flat,
  ordered grid (no sub-grouping/folders).
- Users can have any number of dashboards.
- The very first dashboard a new user gets is named "Default" but is
  otherwise an ordinary dashboard — fully renamable and deletable like any
  other. It is only auto-created if no dashboards exist yet (see
  "First-load / empty state").
- The app must always have at least one dashboard. Deleting the last
  remaining dashboard is disallowed (the delete action is disabled when
  only one dashboard exists).
- The currently active dashboard is remembered and restored as the active
  one the next time the app loads.
- Each dashboard has its own optional background image (see "Backgrounds").

### Dashboard tab strip

- Rendered as a row of pill-shaped tabs in the top bar, immediately after
  the logo. Always visible, never collapsed behind a menu.
- Each tab shows the dashboard's name (truncated with an ellipsis if it
  doesn't fit; the full name is not otherwise shown).
- Hovering a tab reveals its options button (see "Shared UI Patterns");
  clicking elsewhere on the tab switches to that dashboard.
- Switching dashboards updates the grid to that dashboard's links and its
  background, and persists the new active dashboard.
- A trailing "+" button (with its own tooltip, "Add dashboard") appends a
  new dashboard named "New dashboard" and switches to it immediately, ready
  to be renamed via its options menu.
- Renaming a dashboard is done via its edit dialog (name + background image
  URL fields); it never renames in place inline on the tab itself.
- A link tile can be dropped directly onto a dashboard's tab (drag-and-drop)
  to move that link there — see "Moving a link to a different dashboard"
  below. While a dragged tile is over a valid tab, that tab is visibly
  highlighted.

## Links

Each link consists of:

- **Title** (free text; an empty title displays as "Untitled" on its tile)
- **Target URL**
- **Background image URL** (optional)

### Link grid

- Links render in a **responsive grid** of fixed-size tiles (roughly
  square-ish, 16:9 aspect ratio) that reflow/wrap to fill the available
  window width, centered as a block with a maximum overall width so the
  grid doesn't stretch edge-to-edge on very wide screens.
- When the dashboard has at least one link, a trailing tile at the end of
  the grid — matching the size of a normal link tile, dashed border, "+"
  glyph — adds a new link (see "Creating links").

### Link tile anatomy

- The tile's background is either its background image (`cover`, centered)
  or, if none is set or it fails to load, a plain neutral surface color.
- A title badge sits over the bottom-left of the tile (dark translucent
  pill, white truncated text) showing the link's title.
- The whole tile is a link: clicking anywhere on it (outside the hover
  controls) navigates the current tab to the target URL. A modifier-click
  (cmd/ctrl-click) follows the browser's normal "open in new tab" behavior
  — no custom handling.
- Hovering the tile reveals its options button in the top-right corner
  (see "Shared UI Patterns").
- A drag-and-drop reorder or move must never *also* register as a
  navigation click — dragging a tile and dropping it must not open its
  link, even though the same element is both draggable and a live link.

### Creating links

- The "Add" tile (in a non-empty grid), the empty-state's "Add link"
  button, or the **⌥N** keyboard shortcut (see "Keyboard shortcuts") all
  create a new link with placeholder values — Title "New link", URL
  `https://example.com`, no background image — and immediately open its
  edit dialog. Dismissing that dialog any way other than Save leaves the
  placeholder link in place, unedited.

### Editing links

- Edit dialog fields: Title, URL, Background image URL. Save persists all
  three; Cancel/dismiss discards changes.

### URL handling

- If a target URL or background image URL is entered without a scheme
  (e.g. `github.com`), `https://` is auto-prepended when it's saved. An
  empty background-image field stays empty (this is how a user clears a
  previously-set background image).
- URL fields are validated on save: the normalized value must be a
  parseable `http`/`https` URL. An invalid value shows an inline error and
  blocks the save; Cancel/dismiss still discards freely. An empty
  background-image field is always valid (see above).
- Broken background images fall back silently — see "Shared UI Patterns."

### Ordering & moving links

- Links within a dashboard are ordered, and that order is persisted.
- Reordering within a dashboard is done via drag-and-drop on the grid;
  dropping a tile in a new position shifts the others to make room.
- Moving a link to a different dashboard, two ways:
  1. Tile's options menu → **Move to…** → pick a dashboard by name.
  2. Dragging the tile and dropping it directly onto that dashboard's tab
     in the top tab strip.
  Either way, the link is appended to the end of the target dashboard's
  order (not inserted at a specific position).

## Keyboard shortcuts

All shortcuts use the **Alt** modifier (labeled **⌥** on macOS, **Alt**
elsewhere) held together with a digit, letter, or arrow/bracket key:

- **⌥1 – ⌥9, ⌥0** switch directly to the dashboard at that position in the
  *displayed* tab strip order (⌥0 is the 10th position). This range is
  permanent — an 11th+ dashboard has no shortcut, by design, not as a gap to
  fill later (no second-tier binding, no Chrome-style "reuse the last slot").
- **⌥← / ⌥→** and **⌥[ / ⌥]** step to the previous/next dashboard, wrapping
  around at both ends.
- **⌥N** adds a new link to the active dashboard (see "Creating links") —
  not a new dashboard.
- **?** opens a help overlay listing every shortcut above.
- **Discovery.** Nothing is visible at rest. Holding **⌥** reveals a small
  digit badge on each of the first ten dashboard tabs (1–9, then 0),
  showing that tab's shortcut; the badges disappear the instant ⌥ is
  released and never shift the tab strip's layout. A small, always-visible
  hint in the bottom-left corner of the viewport shows the `?` key and a
  short label inviting the user to open the shortcuts overlay (see
  "Application Shell").
- **Shortcuts never fire while the user is typing or a dialog is open.**
  Focusing any text field (a Title, URL, or dashboard-name input) or having
  any edit/confirm/shortcuts dialog open makes every shortcut above inert
  — the key types or behaves exactly as if no shortcut existed.
- Shortcuts are not user-remappable (see "Explicitly Out of Scope").

## Backgrounds

- **Per-link background**: an image URL, set per link, shown behind that
  link's own tile only.
- **Per-dashboard background**: an image URL, set per dashboard, shown
  behind the grid area for that dashboard (the top bar itself is unaffected
  and stays a plain surface). Set by pasting a URL only — no file upload —
  to avoid bloating client-side storage with embedded image data.
- There is no app-wide/global background; backgrounds are scoped to links
  and dashboards only, one at a time.
- Broken background image URLs (link or dashboard) fall back silently to a
  neutral background color, per "Shared UI Patterns."

## First-load / empty state

- A brand-new user (no existing data at all) starts with a single, empty
  "Default" dashboard.
- A dashboard with zero links shows a centered welcome card in place of the
  grid — a short title, a one-line instruction, and its own "Add link"
  button — instead of an empty grid. No pre-populated example links.

## Data & Storage

- All app state (dashboards, their links, link properties, dashboard
  backgrounds, and which dashboard is active) is persisted locally in the
  browser, independent of any specific storage engine, so a real
  backend/sync service could be substituted later without changing any
  product behavior described above.

### Export / Import

- Users can **export** all app data as a single downloadable JSON file, at
  any time, via the import/export menu in the top bar.
- Users can **import** a previously exported JSON file via the same menu to
  restore/merge that data back in.
- See `docs/DATA_FORMATS.md` for the exact JSON shape.

### One-time legacy migration (compatibility requirement)

- A previous, simpler version of this app stored a single dashboard's worth
  of links as a flat list directly in the browser (under a well-known
  storage key), plus one shared background image URL for the whole thing.
  A from-scratch reimplementation must still support any user arriving with
  that old data present in their browser.
- On first load, if that legacy data is found, it is imported automatically
  (no user action needed): it becomes one new dashboard named "Imported"
  whose background comes from the legacy shared background URL, with each
  legacy link becoming a link in that dashboard (label→title, url→url,
  image→background image). A couple of legacy-only fields have no
  equivalent in the current model and are dropped. Once imported, the old
  data is deleted so it is never re-imported on a later visit.
- The same mapping is also available via the manual **Import** action, for
  a user who has a copy of their old exported data as a file rather than it
  being present live in their browser.
- This auto-migration is the primary safety net against data loss, since
  there is no backend/sync.
- Exact field-by-field mapping: see `docs/DATA_FORMATS.md`.

## Explicitly Out of Scope

- The browser extension that redirects the new-tab page here (a link to
  install the real one is shown in the app's footer, but building it is
  out of scope for this repo).
- Web/link search.
- Global/app-wide settings (theme, layout preferences, etc.).
- Folders or nested grouping of links.
- Multiple simultaneous backgrounds per dashboard (e.g. per-section).
- Mobile/touch support.
- Backend sync (the storage layer must allow for it later, but it is not
  implemented now).
- User-remappable keyboard shortcuts.

## Open Items for Future Consideration

- Whether/when a real backend gets introduced, and what triggers that.
- Browser support beyond Chrome (Firefox, Safari, Edge/Brave via
  Chromium compatibility).
- URL validation is now enforced (see "URL handling"): link and
  dashboard-background URL fields must be a parseable `http`/`https` URL
  after normalization, or the save is blocked with an inline error.
  Titles and dashboard names intentionally remain free-form/unvalidated
  (e.g. an empty title is explicitly supported — it displays as
  "Untitled").
- A keyboard shortcut for creating a new *dashboard* (⌥N currently only
  creates a link — see "Keyboard shortcuts"). **⌥⇧N (Alt+Shift+N) is
  reserved** for this if/when it's implemented; no other binding should be
  assigned to it in the meantime.
