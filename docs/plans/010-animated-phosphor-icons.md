# 010 — Animated Phosphor icons

Swap the app's static `@phosphor-icons/react` glyphs for hand-animated
equivalents from [phosphor-animated](https://github.com/theoluciano/phosphor-animated)
(<https://phosphor-animated.com>) wherever an animated version exists.

## Source library — what it actually is

- **Not a package.** 163 icons distributed as shadcn registry items:
  `npx shadcn@latest add "https://phosphor-animated.com/r/<name>.json"`
  writes `components/icons/<name>.tsx` into the repo (ours to edit) plus a
  shared runtime `components/icons/animated-icon.tsx`
  (`registryDependencies` pulls it automatically). With our
  `components.json` aliases these land in `src/components/icons/`.
- **One real dependency: `motion`** (Framer Motion's successor). Today the
  project has no JS animation library at all — all motion is CSS
  (`tw-animate-css`, the `--ease-*` tokens, `motion-dialog`/`motion-popup`
  utilities in `src/index.css`). This plan introduces one.
- **Per-icon file shape**: a `GEOMETRY` object (Phosphor's SVG primitives
  per weight) + a `Choreography` keyframe object, fed to
  `createAnimatedIcon(name, GEOMETRY, STROKE)`. Both are plain data —
  retuning or authoring a new icon by hand is expected, not a fork.
- **Props**: `weight` (thin/light/regular/bold/duotone, default `regular`),
  `trigger` (`hover` | `click` | `in-view` | `loop` | `none`, default
  `hover`), `size` (default 24), `speed`, `fill`, plus normal SVG props.
- **Imperative handle**: `AnimatedIconHandle = { play(); stop() }` via
  `useImperativeHandle` — the escape hatch this project needs (see
  Constraint 1).
- **Reduced motion**: the runtime calls Motion's `useReducedMotion()` and
  pins the icon to its rest state. This satisfies the repo's reduced-motion
  policy without a `motion-safe:` prefix, and is stronger than the CSS
  mechanism documented in TECHNICAL_DESIGN's "Known Gotchas" (which
  deliberately leaves a `scale` hole).

## Icon inventory

Every `@phosphor-icons/react` import in `src/` today:

| Icon | Call sites | Animated equivalent | Verdict |
|---|---|---|---|
| `PlusIcon` | `DashboardTabs.tsx:109` (add-dashboard button), `EmptyState.tsx:15` ("Add link" button) | `plus` — strokes pinch and overshoot | **Adopt** |
| `XIcon` | `ui/dialog.tsx:71` (dialog close) | `x` | **Adopt** |
| `CaretRightIcon` | `ui/dropdown-menu.tsx:123` (`DropdownMenuSubTrigger` → the "Move to…" submenu) | `caret-right` | **Adopt** |
| `DotsThreeVerticalIcon` | `OptionsMenu.tsx:54` (every kebab trigger: link tiles, dashboard tabs, import/export) | `dots-three` — **horizontal only**, no vertical variant | **Adopt, and switch the glyph to horizontal** (see Phase 3) |
| `CheckIcon` | `ui/dropdown-menu.tsx:177,217` (`DropdownMenuCheckboxItem`/`RadioItem`) | `check` | **Skip** — neither component has a consumer in this app; swapping it adds an unused file |

Non-Phosphor glyphs:

- `DashboardGrid.tsx:34` — the add-link tile renders a literal `+`
  character, not an icon. In scope: it becomes the animated `Plus` so both
  "add" affordances behave alike (Phase 5).
- `LogoIcon.tsx` / `Wordmark.tsx` — hand-authored branding SVGs, out of
  scope, untouched.

## Constraints found while reviewing

1. **`[&_svg]:pointer-events-none` defeats the default `hover` trigger.**
   `ui/button.tsx:7` and `ui/dropdown-menu.tsx`'s item classes both set it.
   The library attaches `onMouseEnter`/`onMouseLeave` to the `<motion.svg>`
   root, so with pointer events off the icon never sees a hover and
   `trigger="hover"` is silently inert — compiles, lints, tests green,
   does nothing. This is the central design problem of the change.
2. **The hover target is the button, not the glyph.** Even with pointer
   events restored, an icon-only button has padding and (for `icon-xs`) a
   `before:-inset-2` enlarged hit area; a text+icon button like "Add link"
   is mostly *not* the glyph. Animation should fire when the *control* is
   hovered.
3. **Sizing.** Animated icons render `width`/`height` attributes from
   `size` (default 24). Button/menu classes size SVGs via
   `[&_svg:not([class*='size-'])]:size-4` — a CSS `width`/`height` beats
   the presentation attribute, so the existing rules keep working. Verify
   in-browser rather than assuming.
4. **`weight="bold"`** is currently passed to the kebab icon; the animated
   API takes the same prop, so weight parity is free.
5. **`"use client"`** tops each generated file. Harmless under Vite/React
   19 (no RSC), no lint rule objects. Leave it — regenerating an icon
   shouldn't produce a diff.
6. **`components.json`** keeps `"iconLibrary": "phosphor"`; these are
   plain URL registry items, no `registries` entry needed.
7. **`@phosphor-icons/react` stays a dependency** — future `shadcn add`
   runs generate imports from it, and `CheckIcon` still ships in
   `ui/dropdown-menu.tsx`.

## Approach: how a hover animation actually gets triggered

Three options for Constraint 1/2; **B is recommended**.

- **A — `pointer-events-auto` + `trigger="hover"`.** One class per call
  site, no new abstraction. But the animation only fires over the glyph
  itself, so a button's padding is dead space, and re-enabling pointer
  events on the SVG re-introduces exactly what that utility was added to
  prevent (event targets shifting to the icon).
- **B — a project-owned `HoverIcon` wrapper (recommended).** New
  `src/components/icons/HoverIcon.tsx` composing the generated icons:
  renders with `trigger="none"`, holds an `AnimatedIconHandle` ref, and on
  mount binds `pointerenter`/`pointerleave` (plus `focus`/`blur` for
  keyboard parity) to the nearest interactive ancestor found via
  `ref.current.closest('button, a, [role="menuitem"]')`. Keeps
  `pointer-events-none` intact, animates on the control's whole hit area
  including the enlarged one, and centralizes the pattern so call sites
  stay one-liners (`<HoverIcon icon={Plus} />`).
- **C — CSS `group-hover`.** Not viable: the choreography is
  JS/Motion-driven, not class-driven.

Per AGENTS.md this composition lives outside `ui/` — the generated icon
files are the primitives, `HoverIcon` is the opinionated assembly.

## Decisions already made

| Question | Decision |
|---|---|
| Package or vendored source? | Vendored via shadcn registry URLs — matches how every other primitive in `ui/` got here |
| Where do generated files live? | `src/components/icons/` (registry default under our `components` alias) |
| Add `motion`? | Yes — accepted cost, it is the library's only dependency |
| Which icons? | `plus`, `x`, `caret-right`, `dots-three`; `check` skipped as unused |
| Kebab orientation | Switch every options trigger from the vertical glyph to **horizontal** `dots-three`, since that is the orientation the animated set ships. This is a deliberate visual change and contradicts PRD.md's "vertical three-dot glyph" — the PRD is updated in Phase 4 |
| `motion` bundle cost | Accepted. Still measure `dist/` before/after in Phase 1 and record the delta here, but the number does not gate the change |
| Add-link tile's literal `+` | Replaced with the animated `Plus` (Phase 5, in scope) |
| Trigger mechanism | Option B, `HoverIcon` wrapper driven by the nearest interactive ancestor |
| Reduced motion | Rely on the runtime's `useReducedMotion()`; no extra CSS |
| Doc updates | Batched into one Phase 4 at the end, not folded into the phase that causes each edit. `AGENTS.md` is not touched — it already points at TECHNICAL_DESIGN's "Known Gotchas", which is where the new gotcha lands |
| `weight` | Preserve existing per-site weights (`bold` on the kebab, default elsewhere) |

## Phases

### Phase 1 — Install runtime + first icon (`plus`)

1. `npx shadcn@latest add "https://phosphor-animated.com/r/plus.json"`
   (installs `animated-icon.tsx` + `motion`; confirm yarn 4 was used and
   `package.json`/`yarn.lock` are sane).
2. Read `animated-icon.tsx` and confirm the documented behaviors first-hand:
   handle shape, listener attachment, `useReducedMotion` usage.
3. Write `src/components/icons/HoverIcon.tsx` per Option B.
4. Swap `DashboardTabs.tsx` and `EmptyState.tsx` to it.
5. `yarn lint && yarn build && yarn test`, then **verify in a real browser**
   (AGENTS.md): hover the add-dashboard "+" over its padding and its
   `before:-inset-2` area, hover "Add link", tab to each for focus parity,
   and re-check with `prefers-reduced-motion: reduce` forced on.

### Phase 2 — `x` and `caret-right`

1. `shadcn add` both.
2. `ui/dialog.tsx` close button → `HoverIcon`.
3. `ui/dropdown-menu.tsx` `DropdownMenuSubTrigger` → `HoverIcon`; the
   ancestor lookup must resolve to the `[role="menuitem"]` trigger, and
   keyboard navigation into the submenu should animate via the focus
   binding.
4. Same verification pass, plus: open a link's options → "Move to…" with
   both mouse and arrow keys, and confirm no interference with the
   `motion-popup` enter/exit animations already on these popups.

### Phase 3 — the kebab (`DotsThree`, now horizontal)

The animated set has no vertical variant, and rather than hand-authoring
one the app adopts the orientation the library ships: **every options
trigger becomes a horizontal three-dot glyph.** This is the
highest-traffic icon in the app — it appears on every link tile, every
dashboard tab, and the import/export button — so all three pick up the
animation at once from the single `OptionsMenu.tsx` call site.

1. `shadcn add "https://phosphor-animated.com/r/dots-three.json"`.
2. `OptionsMenu.tsx:54` → `<HoverIcon icon={DotsThree} weight="bold" />`,
   preserving the existing `weight="bold"`.
3. Check the glyph's optical fit at `icon-xs` and `icon-sm`: a horizontal
   run of dots is wider and shorter than the vertical one it replaces, so
   confirm it still centers in the round `ghost`/`secondary` triggers and
   doesn't crowd the tile's top-right corner or the tab strip.
4. Browser pass over all three trigger contexts, including the
   `revealOnHover` variant (the tile/tab kebab fades in on
   `group-hover`) — the icon's own hover animation must fire on the same
   gesture that reveals it, not require a second entry.

### Phase 4 — Documentation

Update `docs/PRD.md`:

- "Shared UI Patterns" → the options menu is now described as a
  **horizontal** three-dot glyph (line 68 says "vertical" today).

Update `docs/TECHNICAL_DESIGN.md`:

- **Stack**: note `motion` as a dependency and phosphor-animated as a
  vendored icon source alongside shadcn/ui.
- **Project Structure**: add `src/components/icons/` (generated icon files
  + `animated-icon.tsx` runtime + `HoverIcon.tsx`), and state the rule that
  generated icon files are editable project code.
- **Known Gotchas**: add the `pointer-events-none`-defeats-`trigger="hover"`
  trap (Constraint 1) — it is exactly the "passes typecheck, lint and tests
  while doing nothing" class of bug that section exists for.
- **Reduced motion** gotcha: note the second, JS-side mechanism.

### Phase 5 — The add-link tile's `+`

`DashboardGrid.tsx:34` renders a literal `+` character sized by font
rules; replace it with `<HoverIcon icon={Plus} />` so the add-tile, the
add-dashboard button and the empty-state button all animate identically.
Because the current glyph is typographic, expect to retune size and
optical centering inside the dashed tile rather than dropping the icon in
as-is.

## Scope — files touched

- `package.json`, `yarn.lock` — `motion`
- `src/components/icons/animated-icon.tsx` — generated runtime (new)
- `src/components/icons/plus.tsx`, `x.tsx`, `caret-right.tsx`,
  `dots-three.tsx` — generated (new)
- `src/components/icons/HoverIcon.tsx` — new
- `src/components/DashboardTabs.tsx`, `src/components/EmptyState.tsx`
- `src/components/OptionsMenu.tsx` (Phase 3)
- `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`
- `src/components/DashboardGrid.tsx` (Phase 5)
- `docs/PRD.md`, `docs/TECHNICAL_DESIGN.md`

## Verification

`yarn lint`, `yarn build` (typecheck), `yarn test` — none of which can
catch the failure mode this change is most prone to. Every phase ends with
a real-browser pass over each swapped control: mouse hover across the full
hit area, keyboard focus, and a forced `prefers-reduced-motion: reduce`
run. `docs/fixtures/animation-test-data.json` gives enough tiles/dashboards
to exercise the kebab and submenu paths.

## Notes for the implementing session

Findings from the research pass that aren't obvious from the library's
front page:

- **There is no `/docs` page** — `phosphor-animated.com/docs` 404s. The
  authoritative source is the registry JSON itself: fetch
  `https://phosphor-animated.com/r/registry.json` for the icon list and
  `https://phosphor-animated.com/r/<name>.json` (or `r/animated-icon.json`)
  to read a component's full source before installing it.
- **The runtime behavior described above is second-hand** (summarized from
  `r/animated-icon.json`, not read line by line). Phase 1 step 2 exists
  specifically to confirm the handle shape, which element the listeners
  attach to, and the `useReducedMotion` call against the real installed
  file — don't build `HoverIcon` on this plan's summary alone.
- **Use the local `shadcn` skill** (`.claude/skills/shadcn`) for the
  `shadcn add` runs rather than invoking the CLI blind; the project is
  yarn 4 via Corepack, so check which package manager the CLI picked when
  it adds `motion`.
- **Registry names are kebab-case in the URL, PascalCase on the export**
  (`r/dots-three.json` → `export const DotsThree`).
- **The line numbers in this plan are from 2026-08-29** and will drift once
  the first swap lands; treat them as pointers, not addresses.

## Resolved

All three questions this plan opened have been answered and folded into
"Decisions already made": adopt the horizontal `dots-three` everywhere
rather than authoring a vertical variant, accept the `motion` dependency,
and convert the add-link tile's `+` as well.
