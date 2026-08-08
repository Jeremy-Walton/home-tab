# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Launch Tabs (a.k.a. Home Tab) — a browser new-tab dashboard for quickly navigating to favorite websites.

Product requirements: @docs/PRD.md
Architecture and stack decisions: @docs/TECHNICAL_DESIGN.md
Export/import wire formats: @docs/DATA_FORMATS.md
CSS Modules structuring methodology (Block/Element/Modifier): @docs/BEM.md

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

## Comments

Keep comments short — one line stating the non-obvious *why*, not a multi-line
explanation of mechanism or history. If it needs more than a line, that detail
belongs in `docs/TECHNICAL_DESIGN.md`'s "Known Gotchas," not inline.

Don't call preserved-but-currently-unexercised styling/behavior "dead code,"
"unreachable," or "kept for parity" — in code comments, commit messages, or
chat. `src/components/ui/` primitives are full-featured design-system
components ported faithfully (see `docs/plans/009-tailwind-to-css-modules.md`'s
Decisions table); a disabled-state rule or variant with no current call site
is deliberate completeness, not cruft, and a comment flagging it as unused
goes stale and invites future deletion of something that was never dead.

## Gotchas

Known gotchas (dnd-kit/click interaction, RxDB ready-state timing, legacy import gating, hotkeys-js's per-element capture latching and module-singleton state) are documented in `docs/TECHNICAL_DESIGN.md`'s "Known Gotchas" section — read it before touching drag-and-drop, the RxDB bootstrap effect, legacy import in `AppStateContext.tsx`, or keyboard shortcut bindings in `useKeyboardShortcuts.ts`.

UI changes in this repo need browser verification beyond typecheck/lint/tests
— every real bug found so far was invisible to all three and only showed up
when actually clicking/dragging in a browser. The general click-through/
visual QA pass (does it look right at various sizes, does a drag feel
smooth) is the user's own job — hand it back with a checklist rather than
running it yourself. When a specific computed-CSS/DOM fact is worth
confirming directly (a token resolves to the right value, a cascade conflict
is real, a fix reproduces the prior computed output), a throwaway Playwright
script (a devDependency) run with `node` works better than the
`mcp__claude-in-chrome__*` tools — write it inside the project directory,
not `/tmp` (Yarn's `node-modules` linker can't resolve `import { chromium }
from 'playwright'` from outside the repo), and delete it when done.
