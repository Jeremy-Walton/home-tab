# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Launch Tabs (a.k.a. Home Tab) — a browser new-tab dashboard for quickly navigating to favorite websites.

Product requirements: @docs/PRD.md
Architecture and stack decisions: @docs/TECHNICAL_DESIGN.md
Export/import wire formats: @docs/DATA_FORMATS.md

## Current State

Fully implemented per `docs/PRD.md` and `docs/TECHNICAL_DESIGN.md`: all
core features (dashboards, links, drag-drop reorder/move, backgrounds,
export/import + legacy migration) are built. See `docs/TECHNICAL_DESIGN.md`'s
"Open Items" for known gaps (test coverage, hosting/CI branch mismatch,
no custom domain yet).

## Commands

- `yarn dev` — start the Vite dev server
- `yarn build` — typecheck (`tsc -b`) then production build
- `yarn lint` — ESLint
- `yarn test` — Vitest (single run); `yarn test:watch` for watch mode

Run typecheck, lint, and tests before considering any change done — none of them are caught by the others.

## Gotchas

Known gotchas (dnd-kit/click interaction, RxDB ready-state timing, legacy import gating) are documented in `docs/TECHNICAL_DESIGN.md`'s "Known Gotchas" section — read it before touching drag-and-drop, the RxDB bootstrap effect, or legacy import in `AppStateContext.tsx`.

UI changes in this repo should be verified in an actual browser (Playwright/`chromium-cli`), not just via typecheck/lint/tests. Every real bug found so far was invisible to all three and only showed up when actually clicking/dragging in a browser.
