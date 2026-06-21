# Launch Tabs — Product Requirements Document

## Overview

Launch Tabs is a static single-page app (SPA) that serves as a browser
new-tab dashboard for quickly navigating to favorite websites. It is paired
with an external browser extension (out of scope for this repo) that
redirects the browser's new-tab page to this SPA. The app is hosted on
GitHub Pages under a custom domain and loaded fresh each time a new tab
opens.

There is no backend in v1. All data is persisted client-side through a
storage abstraction layer (see "Data & Storage" below) so that a real
backend can be swapped in later without changing the rest of the app.

This document is intentionally stack-agnostic except where a requirement
has direct technical implications (e.g. static hosting, swappable storage).

## Scope

- Chrome-first, desktop only. No mobile/touch support required.
- No search functionality (web search or link search) — purely a link grid.
- No global/app-wide settings panel in v1.
- No backend/sync in v1, but the storage layer must not assume localStorage
  is permanent.

## Core Concepts

### Dashboards

- A **dashboard** is a named collection of links, rendered as a flat,
  ordered grid (no sub-grouping/folders).
- Users can have any number of dashboards.
- The first dashboard is named "Default" but is otherwise an ordinary
  dashboard — fully renamable and deletable like any other.
- The app must always have at least one dashboard. Deleting the last
  remaining dashboard is disallowed (the delete action is disabled/blocked
  when only one dashboard exists).
- The currently active dashboard is persisted and restored as the active
  one the next time a new tab is opened.
- Each dashboard has its own background image (see "Backgrounds").

#### Dashboard management

- A small, always-visible (non-collapsible) list of dashboards is shown in
  the top-left of the screen.
- Each dashboard in the list has a menu offering **Rename** and **Delete**.
- Deleting a dashboard deletes all links within it, and requires a
  confirmation prompt before proceeding.
- Renaming a dashboard edits its name in place.
- Switching dashboards updates the grid to show that dashboard's links and
  persists the new active dashboard.

### Links

Each link consists of:

- **Title** (text)
- **Target URL**
- **Background image URL** (optional)
- **Background color** (optional — typically chosen to complement the
  background image)

#### Creating links

- An "Add link" button on the current dashboard creates a new link with
  default placeholder values, which the user then edits via the tile's
  edit controls.

#### Editing links

- Edit controls (edit, move, delete) are revealed on hover over a tile,
  not always visible and not behind a separate "edit mode" toggle.
- Editing a link lets the user change title, target URL, background image
  URL, and background color.
- Deleting a link requires a confirmation prompt.

#### URL handling

- If a target URL or background image URL is entered without a scheme,
  `https://` is auto-prepended.
- If a background image fails to load (broken URL, 404, etc.), the tile
  silently falls back to its plain background color (or a default
  background if no color is set) — no broken-image icon or visible error
  state.

#### Ordering & moving links

- Links within a dashboard are ordered, and that order is persisted.
- Reordering within a dashboard is done via drag-and-drop on the grid.
- A link can be moved to a different dashboard in two ways:
  1. Via the hover edit menu → "Move to..." → select target dashboard.
  2. By dragging the link tile directly onto a dashboard's entry in the
     dashboard list.
- A moved link is appended to the end of the target dashboard's link
  order.

### Backgrounds

- **Per-link background**: an image URL and/or color, set per link, shown
  behind that link's tile.
- **Per-dashboard background**: an image URL, set per dashboard, shown
  behind the entire grid for that dashboard. Pasted as a URL only (no file
  upload), to avoid bloating client-side storage with embedded image data.
- There is no app-wide/global background — backgrounds are scoped to
  links and dashboards only.
- Broken background image URLs (link or dashboard) fall back silently to
  a plain color, per "URL handling" above.

### Navigation behavior

- Clicking a link tile navigates in the **same tab** (standard browser
  link behavior). Modifier-click (cmd/ctrl-click) follows normal browser
  behavior to open in a new tab — no custom handling required.

### Grid layout

- Links render in a **responsive grid** with a fixed tile size; tiles
  reflow (wrap) to fill the available window width (e.g. CSS Grid with
  `auto-fill`/`auto-fit`).

### First-load / empty state

- A brand-new user starts with a single, empty "Default" dashboard.
- The empty dashboard shows a welcome message plus the "Add link" button
  — no pre-populated example links.

## Data & Storage

- All app state (dashboards, their links, link properties, dashboard
  backgrounds, active dashboard) is persisted through a **storage
  abstraction layer** — a DSL/interface that defines how data is read and
  written, independent of the underlying storage mechanism.
- The default/v1 implementation of this layer persists to `localStorage`.
- The interface must be designed so that a different backing store (e.g.
  a real backend/database) can be substituted later without changing the
  rest of the app's logic.

### Export / Import

- Users can **export** all app data (dashboards, links, backgrounds, etc.)
  as a downloadable JSON file.
- Users can **import** a previously exported JSON file to restore/replace
  app data.
- Users can **import** from a previous localstorage data format.
- This is the primary safety net against data loss, since v1 has no
  backend/sync.

## Explicitly Out of Scope (v1)

- The browser extension that redirects the new-tab page here.
- Web/link search.
- Global/app-wide settings (theme, layout preferences, etc.).
- Folders or nested grouping of links.
- Multiple simultaneous backgrounds per dashboard (e.g. per-section).
- Mobile/touch support.
- Backend sync (the storage layer must allow for it later, but it is not
  implemented now).

## Open Items for Future Consideration

- Concrete shape of the storage abstraction interface (methods,
  serialization format) — to be defined during technical design.
- Whether/when a real backend gets introduced, and what triggers that.
- Browser support beyond Chrome (Firefox, Safari, Edge/Brave via
  Chromium compatibility).
