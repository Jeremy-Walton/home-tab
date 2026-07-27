# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Launch Tabs (a.k.a. Home Tab) — a browser new-tab dashboard for quickly navigating to favorite websites.

Product requirements: @docs/PRD.md
Architecture and stack decisions: @docs/TECHNICAL_DESIGN.md
Export/import wire formats: @docs/DATA_FORMATS.md

## Plans

Implementation plans live in `docs/plans/`, one file per plan, named
`NNN-kebab-slug.md` with a zero-padded sequence number (`009-…`). Numbers are
never reused, including by rejected plans. A plan file is deleted in the commit
that lands its work.

If a decision a plan already recorded (e.g. its "Decisions already made"
table) changes after that phase has shipped and been approved, update the
plan file's record — decision table, Scope file list, maintenance notes —
rather than leaving it stale. The plan stays checked in and readable until
its work lands, so it should describe what actually shipped, not just what
was originally decided.

## Current State

Fully implemented per `docs/PRD.md` and `docs/TECHNICAL_DESIGN.md`: all
core features (dashboards, links, drag-drop reorder/move, backgrounds,
export/import + legacy migration, keyboard shortcuts) are built. See
`docs/TECHNICAL_DESIGN.md`'s "Open Items" for known gaps (test coverage,
hosting/CI branch mismatch, no custom domain yet).

## Commands

- `yarn dev` — start the Vite dev server
- `yarn build` — typecheck (`tsc -b`) then production build
- `yarn lint` — ESLint
- `yarn test` — Vitest (single run); `yarn test:watch` for watch mode

Run typecheck, lint, and tests before considering any change done — none of them are caught by the others.

## Gotchas

Known gotchas (dnd-kit/click interaction, RxDB ready-state timing, legacy import gating, hotkeys-js's per-element capture latching and module-singleton state) are documented in `docs/TECHNICAL_DESIGN.md`'s "Known Gotchas" section — read it before touching drag-and-drop, the RxDB bootstrap effect, legacy import in `AppStateContext.tsx`, or keyboard shortcut bindings in `useKeyboardShortcuts.ts`.

UI changes in this repo should be verified in an actual browser (Playwright/`chromium-cli`), not just via typecheck/lint/tests. Every real bug found so far was invisible to all three and only showed up when actually clicking/dragging in a browser.
