# 009 — Migrate from Tailwind to CSS Modules

Replace Tailwind CSS v4 + `tw-animate-css` + the shadcn class-string layer
with hand-written CSS Modules, one folder per component. Tailwind stays
functioning throughout, and every phase leaves the app shippable and
independently reviewable in a browser.

Tailwind is **decommissioned from the runtime, not uninstalled**: the
`tailwindcss`, `tw-animate-css`, `tailwind-merge` and `shadcn` packages and
`components.json` all stay, so `shadcn add` keeps working and a
registry component can still be pulled in and then converted to CSS Modules
(see "Adding a shadcn component after this migration").

> This file was trimmed after Part 5.4 landed — the exhaustive bug-hunt
> narratives, exact Playwright output, and per-part planning notes for
> completed work were compressed into "Progress so far" below. `git log`
> has the full commit history; nothing durable was dropped, only the
> forensic trail that already did its job.

## Decisions already made

| Question | Decision |
|---|---|
| Test file location | Top-level `tests/`, mirroring `src/`'s subfolders; `setup.ts` + `testDb.ts` → `tests/support/`. `src/` ends with zero test files. |
| Component folder shape | Folder named after the component, files inside share that name, **no barrel** — `components/ui/button/{button.tsx,button.module.css}`, imported as `@/components/ui/button/button`. |
| Design tokens | One global `src/styles/tokens.css` holding the existing color/radius/motion vars **plus** explicit vars for the scales Tailwind implied (spacing, font size, line height, font weight, shadow, z-index). Modules reference `var()`, not magic numbers. |
| Tokens/styling with no call site in this app yet (`--sidebar-*`, `--chart-*`, a component's disabled-state or nested-context rules, etc.) | **Kept, ported faithfully, no comments calling it out.** These are full-featured components; parity means porting the whole component, not just the parts this app's current call sites happen to exercise. |
| Scope of the "port faithfully, no call site" rule above | **`src/components/ui/` only.** Those are reusable, shadcn-sourced design-system primitives, not owned by any one call site. **App-level components (`src/components/` outside `ui/`) get no such obligation** — they exist for exactly one caller each, so an unused prop/variant on one is dead weight, not preserved fidelity. Amended after Part 5.4 (`LogoIcon`): first gave it a `size` variant to avoid a cascade-order conflict with `Navbar`'s override, matching the `ui/` pattern — then dropped the variant entirely on review, since it had zero real call site and this isn't a reusable component. The cascade-order-conflict *fix itself* (a real controlled prop/variant instead of two competing classes) is still correct whenever a component genuinely has more than one real caller with different needs — this only waives *faithfulness for its own sake* on single-caller app components. |
| Scale token naming | **Named tiers, not numeric/abbreviated, for every scale.** Applies to `space` (`--space-3x-small` … `--space-6x-large`, `0.125rem`→`3rem`), `text` (`--text-x-small/small/medium/large/x-large`, replacing Tailwind's `xs/sm/base/lg/3xl`), `radius` (`--radius-small/medium/large/x-large/2x-large/3x-large/4x-large`, replacing `sm/md/lg/xl/2xl/3xl/4xl`), and `shadow` (`--shadow-small/large/x-large`, replacing `sm/lg/xl`) — the `small…large` + `Nx-` prefix vocabulary is the one naming convention for every scale in `tokens.css`. `font-weight` keeps its CSS-spec names (`normal/medium/semibold`); standalone (not size-paired) line-heights got their own small scale, `--leading-snug/normal/relaxed`, since they don't fit the `--text-*-line-height` pairing. Component spacing/sizing is snapped to the nearest defined tier rather than adding a token per exact pre-migration pixel value. |
| Light theme / `dark:` variants | **Collapsed to dark-only.** Every `dark:` override resolves to its winning (dark) value; light `:root` values are discarded; dark values are flattened into `:root`. |
| `<html class="dark">` | **Kept** (amended — the original decision dropped it). Harmless once tokens are flattened into `:root`, and required for the retained shadcn scratch path to preview registry components correctly. |
| CSS reset | Andy Bell's modern reset, verbatim (supplied by the user — see Phase 1). |
| Variant API | **Keep `cva`**, feeding it CSS Module class names; `VariantProps<>` keeps deriving prop types. |
| `cn()` helper | **Unchanged** — `clsx` + `tailwind-merge` both stay. `twMerge` passes hashed module class names straight through, so it is a harmless no-op for converted components, and it stays useful on the shadcn scratch path. |
| Tailwind / shadcn packages | **Not removed.** Decommissioned from the runtime only (see Phase 8). |
| Animations | One shared `src/styles/motion.module.css` holding the keyframes and the two tempo classes; popups pull them in with CSS Modules `composes:`. No global animation class names. |
| CSS Module typing | Generated `.d.ts` per module via `typed-css-modules` (`tcm`), gitignored, regenerated before `tsc` in the mechanical check. |
| Mechanical check | `css:types` → `lint` → `stylelint` → `tsc -b` → `test`, wrapped as `yarn check`, plus a Tailwind-residue grep. No `yarn build` (not selected). |
| Phase granularity | Grouped by tier, 9 phases (0–8). **Amended:** from Phase 3 on, a phase is *not* a unit of work — each phase is broken into **parts, one component per part**, and a part is the unit that gets its own `yarn check`, its own browser pass, its own ⏸ pause, and its own commit. A phase is done when its last part is. |
| Class structuring methodology | **BEM (Block/Element/Modifier), per `docs/BEM.md`, enforced by `@jeremywalton/stylelint-bem`.** CSS source is literal kebab-case BEM (`.button`, `.button--outline`, `.kbd-group`), the real `__`/`--` separators, not a camelCase-flattened stand-in (a first attempt at flattening BEM into bare camelCase was wrong — indistinguishable from an orphaned modifier, and invisible to a linter that only recognizes `__`/`--`). `tcm -c`/`--camelCase` (`css:types` script) and Vite's `css.modules.localsConvention: 'camelCaseOnly'` (`vite.config.ts`) convert every class to a camelCase JS property (`.button--size-icon-xs` → `styles.buttonSizeIconXs`), so `.tsx` call sites still read as camelCase even though the `.css` source doesn't. The two must stay in lockstep or the generated `.d.ts` and Vite's runtime export silently disagree on key names. |

## Conventions

**Native CSS nesting.** Every module uses native CSS nesting (Chrome-only
app, no build-time downleveling needed) rather than flat repeated
selectors: a class's own pseudo-classes/pseudo-elements/`:has()`/`:global()`
states nest inside its own rule via `&`, and a class's own descendant
selectors (`svg { … }`, `::before { … }`) nest as bare selectors. Compiles
to the exact same flat CSS either way — confirmed with Playwright
(`getComputedStyle`) that behavior is byte-identical before/after nesting.
A multi-block file (`dropdown-menu`, `dialog`, `alert-dialog`, …) nests each
block's own modifiers inside *that block's* rule the same way; reaching into
a *different* block (an ancestor-context selector, or the cross-component
pattern below) still nests, just rooted at the reaching block's own `&`.

**Class naming and structuring (BEM).** Every module is structured per
`docs/BEM.md`'s Block/Element/Modifier methodology, written as **real
kebab-case BEM** — literal `__`/`--` separators, not a camelCase stand-in:

- **Block** — the module's root class, generally matching the component's
  own name (`LinkTile.module.css`'s `.tile`, `dialog.module.css`'s
  `.dialog`).
- **Element** — a child class nested inside its block via native CSS
  nesting, one level flat (`.tile__header`, never
  `.tile__header__title` — flatten to `.tile__title`). Only applies to
  *native* JSX children the block renders itself — a **foreign** component
  rendered as a child (a different component this file composes) is never
  an element; see "Cross-component styling" below.
- **Modifier** — always compounded with its block or element, either as
  `&.block--modifier` nested inside the block's own rule, or
  `.block.block--modifier` written directly (both equivalent; see
  `docs/BEM.md`'s nesting example and `CHECKS.md`'s `require-nesting` rule
  for the exact accepted shapes). A CVA variant's class value is a modifier
  by this same rule — `variant: { outline: styles.buttonOutline }` maps to
  the CSS `&.button--outline { }`, never a bare `&.outline { }`.
- **No orphaned elements/modifiers.** `stylelint-bem/no-orphaned-element`
  and `stylelint-bem/no-orphaned-modifier` enforce this mechanically — a
  `.block__element`/`.block--modifier` is invalid unless `.block` is
  defined somewhere in the project.
- **No margin on a block's own root class.** Per BEM.md's "Structure"
  section, a component owns its own look/feel and the layout of its
  slotted elements, but not its position within the page — that's the
  parent's job (grid/flex gap, not margin). Watch for this specifically
  when transcribing Tailwind spacing utilities that used `m-*`/`mt-*`/etc.
  on a component's own root element; translate those to the parent's
  layout instead of porting a literal `margin` declaration.

Enforced by `@jeremywalton/stylelint-bem`'s five rules (`stylelint.config.js`):
`valid-name`, `no-orphaned-element`, `no-orphaned-modifier`,
`no-double-nested-element`, `require-nesting` (default `strict`). Native
pseudo-classes/attributes (`:hover`, `:focus-visible`, `:disabled`,
`[aria-invalid]`, ancestor/sibling context selectors like `kbd`'s
tooltip-nesting or `label`'s peer/group-disabled, or a Base UI-written
`data-*` attribute like `data-active`) are **not** BEM modifiers and are
left as plain selectors — they don't use the configured separators, so the
plugin ignores them entirely, and there's no component prop to drive a
modifier class from for genuinely external/native state. Contrast: a prop
your own component controls (`orientation`, `variant`) always drives a real
`cva()` modifier, never a bare attribute selector, even if the DOM
attribute stays present for other reasons (behavior, debugging).

Keeping JS ergonomic despite kebab-case CSS: `package.json`'s `css:types`
script runs `tcm` with `-c`/`--camelCase`, and `vite.config.ts` sets
`css.modules.localsConvention: 'camelCaseOnly'` — both convert
`.button--size-icon-xs` to the single JS property `buttonSizeIconXs`, so
`.tsx` files reference `styles.buttonSizeIconXs`, never bracket-notation
kebab-case.

**Token usage.** Every color, radius, easing, duration, spacing, font size,
shadow and z-index in a module is `var(--token)`. Literal values are allowed
only for one-off geometry that has no scale equivalent (e.g. `16 / 9`,
`-1px`, a tooltip arrow's rotation-math offsets, a grid's `14rem` tile
width). Color tokens have **no `--color-` prefix** — `tokens.css` defines
`--foreground`, `--popover`, `--muted-foreground`, not `--color-foreground`.
**Border-width** (`--border-width`/`-large`/`-x-large`, 1/2/3px),
**duration** (`--duration-fast`/`-normal`/`-slow`, 100/150/200ms), and
**opacity** (`--opacity-disabled`, 0.5) tokens were added after Part 6.2 —
a Playwright-verified `/simplify`-style pass found these were the only
scales in the migration still written as scattered literals (every other
scale had a token from Phase 1 on). Use them in every part from here on;
don't reintroduce a literal `150ms`/`3px`/`0.5` opacity. **Z-index** also
changed shape: the single shared `--z-popup` became an explicit hierarchy —
`--z-dialog-backdrop` (40) < `--z-dialog-content` (41) < `--z-dropdown` (42)
< `--z-tooltip` (43) — so a popup triggered from within a dialog (or a
tooltip triggered from within a dropdown) is guaranteed to stack above it,
not tied by an equal value relying on DOM paint order. Any new popup-style
`ui/` primitive should pick the tier matching its actual nesting behavior,
not default back to a single shared constant.

**Translating a Tailwind `<color>/<alpha>` modifier.** For a token whose own
value is fully opaque (`--primary`, `--destructive`, `--ring`, `--muted`,
etc.), `bg-foo/40` becomes `oklch(from var(--foo) l c h / 40%)` — a straight
alpha substitution, confirmed byte-identical to Tailwind's own output via
Playwright (`getComputedStyle`). **But `--border` and `--input` are
themselves already translucent** (`oklch(100% 0 0deg / 10%)` and `/ 15%`
respectively) — for those two, Tailwind can't algebraically substitute an
alpha it doesn't know at build time, so it compiles `bg-input/50` to
`color-mix(in oklab, var(--input) 50%, transparent)` instead, which
*multiplies* the existing alpha (15% × 50% = 7.5%), not overrides it. Using
the `oklch(from …)` substitution on `--border`/`--input` silently produces a
far more opaque, visibly-wrong result (a real, shipped bug in Phase 2 before
this was understood). Rule: `--border`/`--input` always translate to
`color-mix(in oklab, var(--token) N%, transparent)`; every other (opaque)
token uses `oklch(from var(--token) l c h / N%)`.

**Cross-component styling (the `group-hover:` translation).** Tailwind's
`group`/`group-hover:` pairs span component boundaries — e.g. `LinkTile`'s
outer `div.group` styling the `AspectRatio` it renders. This is the one
place BEM's "an element only belongs to its own block" rule doesn't apply
cleanly, since `AspectRatio` is itself a separate block (its own component)
rather than an element of `LinkTile`. The CSS Modules equivalent is to keep
*both* classes in the *parent's* module and pass the child one down as a
`className` prop — a **bare, top-level class name**, never a `__`-suffixed
element, even though it's textually nested inside the parent's JSX — the
parent block reaching into a child block it composes, not a same-block
element reference:

```css
/* LinkTile.module.css */
.tile:hover .surface { box-shadow: var(--shadow-x-large); }
```
```tsx
<div className={styles.tile}>
  <AspectRatio className={styles.surface} … />
```

**When the receiving component hasn't converted yet.** A converted file can
still need to forward a literal Tailwind className to a child component
that's still Tailwind (its own part is later in the plan) — that's real,
intentional, *temporary* Tailwind, not a leftover on this file's own
elements, and `scripts/no-tailwind.mjs` can't tell the difference from a
bare line scan. Mark the line with a trailing (or line-above, if the prop is
long) `{/* tailwind-passthrough: … */}` JSX comment, which the script
recognizes and skips. Replace the marker with a real cross-component class
the moment the receiving component converts — don't leave it marked once
it's no longer true.

**When the receiving component has already converted but the cascade
still needs arbitrating.** Two independent CSS Modules files both setting
the same property on the same element is a same-specificity conflict whose
winner depends on stylesheet import order — fragile and not something to
rely on. The fix is always a real, explicit, prop-driven modifier the
consumer opts into (`Button.positioned`, `TabsTrigger.hasOptionsMenu`,
`Empty.fluid`, `AlertDialogDescription.emphasis`), never two competing
classes and never `@layer base` (an earlier, superseded approach — see
"Progress so far" below).

**A literal `group` class can survive a conversion on purpose.** If a
not-yet-converted component (`OptionsMenu.tsx`, until Part 6.1) keys a
`group-hover:` selector off an ancestor, that ancestor's conversion must
keep the literal, unstyled `group` className alongside its real BEM block
class (`cn('group', styles.tile)`) until the dependent file converts too.
Comment why, briefly, at the call site.

**Base UI state selectors.** `data-open` / `data-closed` / `data-side` /
`data-slot` attributes stay on the elements exactly as they are today; only
the selector syntax changes (`data-open:animate-in` → `.content[data-open]
{ animation: … }`). Do not remove any `data-slot` attribute — several are
load-bearing for descendant selectors. By convention in this codebase,
`data-*` attribute selectors are written bare (`&[data-open]`); `aria-*`
attribute selectors are wrapped in `:global()` (`&:global([aria-invalid=
'true'])`) — an established stylistic split, not a functional requirement.

**Reduced motion.** Each module that animates carries its own
`@media (prefers-reduced-motion: reduce)` block, and every press-feedback
transform becomes an explicit `@media (prefers-reduced-motion: no-preference)`
block. **A shared keyframe can't be referenced by bare name across a CSS
Modules file boundary** — Vite scopes every `animation-name` value against
the *current file's own* hash regardless of whether a matching `@keyframes`
exists elsewhere, so a bare `animation-name: popIn;` in a file with no local
`@keyframes popIn` silently resolves to nothing (no error, no motion). Files
that need `motion.module.css`'s tempo classes use `composes:`; files that
need its actual keyframe *names* (`dialog`, `alert-dialog`, and any future
consumer with the same shape) duplicate the four `fadeIn`/`fadeOut`/`popIn`/
`popOut` `@keyframes` blocks locally rather than referencing the shared file.

## Mechanical check

Run at the end of **every part**:

```json
"css:types":   "tcm src -p \"**/*.module.css\"",
"stylelint":   "stylelint \"src/**/*.css\"",
"no-tailwind": "node scripts/no-tailwind.mjs",
"check":       "yarn css:types && yarn lint && yarn stylelint && yarn no-tailwind && tsc -b && yarn test"
```

`css:types` must run before `tsc -b` — the generated `.d.ts` files are what
make `styles.foo` type-check.

`scripts/no-tailwind.mjs` holds a `MIGRATED` array of globs that grows one
entry per **part**. It scans those files' `.tsx` (never `.module.css` —
real CSS is full of false positives against these patterns) for string
literals containing tokens matching Tailwind utility patterns and exits `1`
with `file:line` on any hit. Lines matching `^\s*(import|export)\b.*\bfrom\b`
are skipped, as are lines carrying a `tailwind-passthrough` marker (see
Conventions). The patterns themselves have accumulated several
false-positive guards worth knowing about before assuming a flagged line is
real: `(?<!--)` before every prefix-word pattern (guards a `var(--token)`
reference inlined in a `.tsx` `style` prop against the same-named Tailwind
class), `(?<!aria-)` before `hidden` (guards the real `aria-hidden`
attribute), and `transition-`/`ease-` require a literal `-` suffix (guards
JS identifiers like dnd-kit's own `transition` return value). In Phase 8,
`MIGRATED` is replaced with `['src/**/*.tsx', 'index.html']`.

---

## Progress so far — Phases 0–4 and Parts 5.1–5.4 (done and committed)

Every phase/part below shipped, passed `yarn check` (81 tests throughout,
same count from Phase 0 on), and was browser-verified live with Playwright
against the running dev server — not just typecheck/lint/tests. What
follows is only the facts later parts still depend on; full narrative
history (exact bug hunts, computed-style numbers, superseded-then-corrected
trails) has been trimmed now that the work has landed — `git log` has the
commits if the detail is ever needed.

**Phase 0 — tests moved.** `tests/` now mirrors `src/`'s structure; `src/`
has zero test files.

**Phase 1 — foundations.** `tokens.css`, `global.css` (the reset),
`motion.module.css`, and tooling (`css:types`/`stylelint`/`no-tailwind`/
`check`) all in place. `motion.module.css` has 4 cardinal `slideInFrom*`
keyframes, not 8 (`inline-start`/`inline-end` reuse `right`/`left` —
RTL not supported); `.dialog[data-open/closed]` sets only duration/timing,
no `animation-name` (each consumer supplies its own — see the Conventions
note on cross-file keyframe references); `.popup[data-open/closed]` bakes
in `animation-name` fully, since every popup consumer wants identical
behavior. `global.css` later gained a `.sr-only` utility (Part 3.3).

**Phase 2 — leaf `ui/` primitives** (`button`, `badge`, `kbd`, `label`,
`input`, `separator`, `aspect-ratio`). All converted to real kebab-case BEM
(`@jeremywalton/stylelint-bem` installed and enforced from this phase on).
`button`'s `positioned` prop (`.button--positioned`) is what a consumer
needing the button absolutely-positioned within its own layout reaches for
— it replaced an earlier `@layer base` escape hatch, per the Conventions
note on arbitrating a settled cascade conflict. `separator`'s
`[data-orientation]` attribute never actually applied under the installed
Base UI version — converted to a real `cva()` driven by the `orientation`
prop instead, incidentally fixing dead styling.

**Phase 3 — composite `ui/` primitives** (`tooltip`, `dropdown-menu`,
`dialog`, `alert-dialog`, `tabs`, `field`, `empty`). All converted.
`dialog`/`alert-dialog` each duplicate the four shared keyframes locally
(see Conventions). `no-descending-specificity` is disabled project-wide
(doesn't understand BEM/CSS-Modules file scoping, false-positives across
unrelated blocks in the same file). New tokens landed here:
`--leading-snug/normal/relaxed`, `--text-x-large` (+ line-height),
`--space-6x-large`. `TabsTrigger.hasOptionsMenu` and `Empty.fluid` are the
prop-driven fixes for `tabs`/`empty`'s own still-Tailwind consumers (same
pattern as `button.positioned`). **A universal Tailwind base-layer rule**
(`* { @apply border-border outline-ring/50; }` in `src/index.css`) silently
supplies `border-color: var(--border)` to every element that doesn't set
its own — found because `empty.module.css` and `field.module.css` both had
a border with no explicit color, unknowingly relying on it. Fixed at the
source in both files. **This rule disappears at Phase 8** — re-check for
the same gap in any remaining part that adds a border without an explicit
color.

**Phase 4 — grid surface** (`DashboardGrid`, `LinkTile`, `EmptyState`), the
first phase with real component nesting, converted container-down (grid →
tile → empty state) so the container is proven before its children. All
converted. `LinkTile` and `DashboardTabs` (Phase 5) both carry a literal,
unstyled `group` className alongside their real BEM block class —
`OptionsMenu.tsx` (not converted until Part 6.1) keys its kebab's
reveal-on-hover off that exact literal marker; remove once Part 6.1 lands.

**Phase 5, Parts 5.1–5.4 — top bar** (`Navbar`, `DashboardTabs`,
`ImportExportBar`, `LogoIcon`). All converted. `no-tailwind.mjs` gained the
`tailwind-passthrough` marker mechanism here (see Mechanical check).
`LogoIcon` is the first (and so far only) case of the app-component
variant-dropping amendment in the Decisions table.

Docs to update in this phase (per `AGENTS.md`, plans describe what actually
shipped): none needed yet — the substantive doc updates land in Phase 8.

---

### Part 5.5 — `Wordmark` (done)

Converted to `Wordmark/{Wordmark.tsx,Wordmark.module.css}`. The component's
only real Tailwind was its sizing (`h-5 w-auto`) — the `<text>`'s
`fontFamily`/`fontSize`/`fontWeight`/`letterSpacing`/`fill` were already
literal SVG presentation attributes, not Tailwind classes, so they carried
over unchanged (same treatment as `LogoIcon`'s literal `fill` hex values —
brand-specific marks stay as-is, not ported into token `var()`s). Correction
to this part's own earlier text: the wordmark uses Space Grotesk (the body
font), not Figtree (the heading font) — it was never a semantic heading
element, so Phase 1's reset delta 3 doesn't apply to it either; both fields
in the original note were wrong. Confirmed via Playwright: `.wordmark`
computes to `height: 20px; width: auto`, `<text>` still computes
`Space Grotesk Variable`, and the logo/wordmark pair are vertically centered
(0px delta) in the flex navbar. `className` prop kept (matches `LogoIcon`'s
precedent — a plain passthrough escape hatch isn't a "variant"), but the
Navbar call site no longer needs to pass one since its default already
matches what `h-5` used to force.

⏸ **PAUSE — Phase 5 complete; review before Phase 6.**

---

## Phase 6 — App components: dialogs and menus (7 parts)

**Scope:** `OptionsMenu`, `EntityOptionsMenu`, `EditDialog`,
`LinkEditModal`, `DashboardEditModal`, `ConfirmDialog`, `ShortcutsDialog` —
one per part, in that order. Same per-part rhythm.

**Why this order.** These are compositions over the Phase 3 primitives, so
most are thin modules — layout and spacing only. The menus go first because
they're the only genuinely risky pair: they carry the hover-reveal behavior
that the Phase 4/5 parents (already converted by now) style *against*, so
this is the first point where both halves of that cross-block relationship
are real CSS Modules and can actually be verified — this is also where the
`group` classes preserved on `LinkTile`/`DashboardTabs` (see "Progress so
far") finally come off. The dialog shell then precedes the two modals built
on it.

Behavioral rule for the whole phase: the `useClosingDialog` contract (local
`open` state + deferring the parent callback to `onOpenChangeComplete`) is
what makes exit animations play at all. It is behavior, not styling —
don't touch it in any part.

---

### Part 6.1 — `OptionsMenu` (done)

Converted to `OptionsMenu/{OptionsMenu.tsx,OptionsMenu.module.css}`. Confirmed
3 real callers, not 2 — `ImportExportBar` uses `OptionsMenu` directly (always
visible, no `revealOnHover`), alongside the two via `EntityOptionsMenu`
(`LinkTile`, `DashboardTabs`) — so this stayed a fully faithful port, no
variant-dropping (unlike `LogoIcon`/`Wordmark`'s single-caller case).

The `revealOnHover` → `.trigger--reveal-on-hover` modifier landed exactly
like `Button.positioned`: it only supplies the *mechanism* (`opacity: 0` +
transition) inside `OptionsMenu.module.css`, same as `.button--positioned`
only supplies `position: absolute`. The actual **reveal condition** — "on
hover of an ancestor outside this component's own subtree" — can't live in
`OptionsMenu.module.css` at all (no selector there can reach an ancestor two
components up), so it's the Cross-component styling convention verbatim:
each parent (`LinkTile.module.css`, `DashboardTabs.module.css`) defines its
own bare `.options-trigger` hook class and a `&:hover .options-trigger {
opacity: 1; }` rule nested in its own block, and passes that class down via
the existing `triggerClassName` prop. `DashboardTabs` additionally overloads
the same class with the specific position it needs (`top: 50%; right:
var(--space-3x-small); translate: 0 -50%;`, replacing the old raw
`triggerClassName="right-0.5 top-1/2 -translate-y-1/2"` passthrough —
`right-0.5` = `0.125rem`, an exact match for `--space-3x-small`) since
`triggerPositioned` only supplies `position: absolute`, same division of
labor as `Button.positioned` itself. `LinkTile` doesn't need any positioning
on its own hook class — that's still handled by its existing `.tile__options`
wrapper div — so its `.options-trigger` carries no declarations of its own,
referenced only inside the nested `:hover` rule; confirmed `tcm` still
extracts and types a class used only in a nested selector, no separate
top-level rule required. The literal `group` marker is gone from both
`LinkTile.tsx` and `DashboardTabs.tsx`.

Browser-verified with Playwright: kebab opacity 0 at rest / 1 on hover for
both the link tile and the dashboard tab; `ImportExportBar`'s kebab stays at
opacity 1 always; the dashboard tab kebab's computed position/translate
matches exactly; a click 4–6px outside the dashboard tab kebab's visible
bounds still opens it (enlarged hit area intact); its tooltip still appears;
the link tile's options menu still opens with the right items.

⏸ **PAUSE — review before Part 6.2.**

---

### Part 6.2 — `EntityOptionsMenu` (done)

Relocated to `EntityOptionsMenu/EntityOptionsMenu.tsx` (no `.module.css` —
it's pure composition over `OptionsMenu` and `dropdown-menu`, no styled
elements of its own, so nothing to convert). Playwright-verified: dashboard
menu's `Delete` is `aria-disabled="true"` with one dashboard, enabled with
two; link menu shows `Edit`/`Move to…`/`Delete`, and hovering "Move to…"
lists the other dashboard by name.

⏸ **PAUSE — review before Part 6.3.**

---

### Part 6.3 — `EditDialog` (done)

Relocated to `EditDialog/EditDialog.tsx` (no `.module.css` — like
`EntityOptionsMenu`, it's pure composition over the Part 3.3 `dialog`
primitive and the Part 3.6 `FieldGroup`, no styled elements of its own to
convert). `LinkEditModal.tsx`/`DashboardEditModal.tsx` import paths updated
to `./EditDialog/EditDialog`.

**Browser verification (you):** open from a link and from a dashboard —
title, field stack and footer laid out correctly; Cancel / click-outside /
Escape all close **with the exit animation** and discard edits.

⏸ **PAUSE — review before Part 6.4.**

---

### Part 6.4 — `LinkEditModal` (done)

Relocated to `LinkEditModal/LinkEditModal.tsx` (no `.module.css` — same
composition-only shape as `EditDialog`/`EntityOptionsMenu`: a field set over
`EditDialog` and the already-converted `Input`/`Field`/`FieldLabel`/
`FieldError`, nothing styled of its own). `App.tsx` and `LinkTile.tsx`
import paths updated to `@/components/LinkEditModal/LinkEditModal`.
**`tests/components/LinkEditModal.test.tsx` updates its import to the new
folder path** — the only test path this phase touches, and the automated
signal that URL validation still renders.

**Browser verification (you):**
- All three fields save (Title, URL, Background image URL)
- `not a url` → inline error, save blocked; `github.com` → saves as
  `https://github.com`; clearing the background field actually clears it

⏸ **PAUSE — review before Part 6.5.**

---

### Part 6.5 — `DashboardEditModal` (done)

Relocated to `DashboardEditModal/DashboardEditModal.tsx` (no `.module.css` —
same composition-only shape as `LinkEditModal`). Name + background image URL
over `EditDialog`. `DashboardTabs.tsx`'s import path updated to
`@/components/DashboardEditModal/DashboardEditModal`.

**Browser verification (you):** rename persists to the tab strip; setting a
background URL changes the grid background; clearing it removes it; an
invalid URL is blocked with an inline error.

⏸ **PAUSE — review before Part 6.6.**

---

### Part 6.6 — `ConfirmDialog` (done)

Relocated to `ConfirmDialog/ConfirmDialog.tsx` (no `.module.css` — pure
composition over the Part 3.4 `alert-dialog`). Shared delete confirmation.
Its `useClosingDialog` variant is the one that needs to know *which*
outcome closed it — behavior, untouched. Uses `AlertDialogDescription`'s
`emphasis` prop (Part 3.4). The one literal className, `"sr-only"` on the
visually-hidden title, isn't Tailwind residue — it's `global.css`'s own
`.sr-only` utility (Part 3.3), referenced the same literal way `ui/dialog`'s
close button already does; `scripts/no-tailwind.mjs` doesn't flag it.
`LinkTile.tsx`/`DashboardTabs.tsx` import paths updated to
`@/components/ConfirmDialog/ConfirmDialog`.

**Browser verification (you):** delete confirm for a link and for a
dashboard (cascade: its links go too); Cancel discards; both close with
their exit animation.

⏸ **PAUSE — review before Part 6.7.**

---

### Part 6.7 — `ShortcutsDialog`

The `?` overlay rendering `SHORTCUTS`, over `dialog` + the already-converted
`kbd`.

**Browser verification (you):**
- `?` opens it; it lists every shortcut with ⌥ labels (⌥ on macOS)
- The `kbd` chips render correctly in their rows
- Shortcuts are inert while it's open, and while a text field is focused

⏸ **PAUSE — Phase 6 complete; review before Phase 7.**

---

## Phase 7 — App shell and global CSS (2 parts)

**Scope:** `src/App.tsx`, `src/index.css` — two parts. These aren't
components, but the split is the same principle: the shell conversion and
the global-CSS teardown are independently reviewable and shouldn't share a
browser pass.

### Part 7.1 — the app shell

Convert `App.tsx`'s layout shell to `src/App/App.tsx` +
`App.module.css` (or keep `App.tsx` at `src/` root with an adjacent
`App.module.css` — it isn't a component folder peer; **pick this** unless
you'd rather it match). Includes the top-bar/content-area split, the
dashboard background layer, and both footer overlays.

`scripts/no-tailwind.mjs`: add `src/App.tsx` (or the new path).

**Browser verification (you):**
- Top bar / content split at several window sizes
- A dashboard background image renders behind the grid only, never behind
  the top bar; a broken dashboard background falls back to flat color
- Both footer overlays positioned and click-through except on the link

⏸ **PAUSE — review before Part 7.2.**

### Part 7.2 — global CSS teardown

1. `src/index.css` → **`src/styles/tailwind-scratch.css`**, not deleted.
   Everything of ours has already moved to
   `tokens.css`/`global.css`/`motion.module.css`; what remains is the
   Tailwind-only layer (`@import "tailwindcss"`, `@import "tw-animate-css"`,
   `@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@theme inline`,
   the two `@utility motion-*` rules, `@layer base`, and the `--tw-enter-*`
   reduced-motion block). Add `@import './tokens.css'` at its top so the
   `@theme inline` var mappings still resolve, and a header comment stating
   that the file is **not imported by the app** and exists only for the
   shadcn scratch path.
2. `main.tsx`: drop the `index.css` import; `global.css` only. Nothing
   imports `tailwind-scratch.css`, so Tailwind emits no CSS into the bundle.

`scripts/no-tailwind.mjs`: add `src/main.tsx`.

**Mechanical check:** `yarn check`. At this point `src/**/*.tsx` should be
fully migrated — grep manually for any stragglers before moving on.

**Browser verification (you):** a full sweep, since the global layer just
changed underneath everything —
- Body font is Space Grotesk, headings Figtree
- Re-run a spot check of one dialog, one menu, one drag
- Re-run Part 7.1's list — the background layer and footers now have no
  Tailwind underneath them

⏸ **PAUSE — Phase 7 complete; review before Phase 8.**

---

## Phase 8 — Decommission Tailwind from the runtime

**Scope:** teardown of Tailwind's *runtime* role. Every package stays
installed. No visual change should occur here — if one does, a module is
depending on Tailwind for something.

1. `package.json`: **remove nothing.** `tailwindcss`, `@tailwindcss/vite`,
   `tw-animate-css`, `tailwind-merge` and `shadcn` all stay.
2. `vite.config.ts`: **keep** the `tailwindcss()` plugin. With no
   `@import "tailwindcss"` anywhere in the module graph it emits nothing, and
   keeping it means `tailwind-scratch.css` works the moment it's imported.
   Verify the no-op claim in step 7 rather than assuming it.
3. `src/lib/utils.ts`: **unchanged.** `cn()` keeps `clsx` + `twMerge`.
   `twMerge` doesn't recognize hashed module class names and passes them
   through in order, so it is inert for converted components. **Watch:**
   this also means the old "twMerge dedupes a consumer override" behavior is
   silently gone for module classes — where a consumer passes `className` as
   a real override, both classes now apply and stylesheet source order
   decides the winner. Check those cross-component call sites specifically.
4. **Keep `components.json`.** Its `"css": "src/index.css"` path is now
   stale — point it at `src/styles/tailwind-scratch.css` so `shadcn add`
   writes its token/variant additions somewhere real.
5. `index.html`: `class="dark"` stays (see Decisions).
6. `scripts/no-tailwind.mjs`: `MIGRATED = ['src/**/*.tsx', 'index.html']`.
   From here on the grep is the gate that forces a freshly-added registry
   component to be converted before it can land — that's the intent, not a
   side effect.
7. Confirm Tailwind ships nothing: `yarn build`, then grep `dist/assets/*.css`
   for a known utility (`\.flex\{`, `\.p-2\{`) — expect zero hits — and
   compare the emitted CSS size against the pre-migration build.
8. Also double-check the universal Tailwind base-layer rule noted in
   "Progress so far" (`* { @apply border-border outline-ring/50; }`) is
   truly gone and nothing was silently relying on it for a border/outline
   color it never set explicitly — grep every `.module.css` for a
   `border-style`/`border-width` pair with no accompanying `border-color`.

**Docs to update in this phase** (per `AGENTS.md`, plans describe what
actually shipped):
- `docs/TECHNICAL_DESIGN.md` → **Stack**: replace the Tailwind/motion-token
  paragraph; rewrite the "UI component layer" entry (Base UI primitives and
  the shadcn registry both remain, but registry output is now a *source* to
  convert, not the shipped styling). **Project Structure**: the new
  folder-per-component layout, `src/styles/`, `tests/`, `scripts/`.
  **Known Gotchas**: rewrite the reduced-motion entry (the `--tw-enter-*`
  mechanism and the `scale: 1` caveat no longer apply to the app, only to the
  scratch file), keep the `aspect-ratio` regeneration note (still live —
  `shadcn add --overwrite` is still possible), add the `composes:`
  cascade-order note and the CSS-Module-typing setup. **Testing Focus**:
  new test paths. Add the "Adding a shadcn component" workflow below.
- `AGENTS.md` → **Commands**: `yarn check`, `yarn css:types`,
  `yarn stylelint`; note that tests live in `tests/`, not `src/`.
- `docs/plans/009-*.md` → delete in the commit that lands this phase.

**Mechanical check:** `yarn check`, plus `yarn build` **once** here — this is
the first point where a missing Tailwind-supplied style would break a
production build rather than just dev.

**Browser verification (you):** the full Phase 2–7 checklists again, in one
pass, since preflight is now genuinely gone. Pay particular attention to
anything preflight was silently providing: `box-sizing`, default margins on
headings/paragraphs, `button`/`input` font inheritance, `img` display, list
markers.

⏸ **DONE.**

---

## Risks and open items

- **Losing Tailwind's preflight is the biggest single risk.** It stops
  loading in Phase 8, but its replacement lands in Phase 1 specifically so
  the two overlap for seven phases and any divergence surfaces early rather
  than all at once. The supplied reset is deliberately lighter than preflight
  — see the four enumerated deltas in Phase 1.
- **The retained Tailwind install can rot silently.** Nothing in `yarn check`
  exercises `tailwind-scratch.css`, so it can break (a renamed token, a
  Tailwind major bump) without any signal until someone next runs
  `shadcn add`. Accepted cost of keeping the path open; if it becomes a
  nuisance, the fix is a `yarn scratch` script that builds with the scratch
  file imported.
- **`typed-css-modules` is not heavily maintained.** It has worked cleanly
  through Phase 5 including `composes: … from '…'`, so this risk is largely
  retired, but keep an eye on it if a future phase's `.d.ts` generation
  starts behaving oddly.
- **Drag-and-drop and the reorder-positioning bugs have no automated
  coverage.** `TECHNICAL_DESIGN.md` documents five separate fixes found only
  by frame-by-frame browser analysis. Phase 4's browser pass (done) verified
  this held; any future change to reorder/move logic still needs the same
  manual rigor — treat the grid container's CSS as load-bearing logic, not
  styling.
- **No new tests are added by this plan.** Phase 0 relocates the existing 81;
  every phase after that must keep them passing at the same count. The
  migration is visual, and its verification is visual by design.

---

## Adding a shadcn component after this migration

The reason Tailwind and `shadcn` stay installed. This workflow lands in
`TECHNICAL_DESIGN.md` in Phase 8:

1. `yarn shadcn add <component>` — writes a Tailwind-classed
   `src/components/ui/<component>.tsx` (flat file, registry convention).
2. Temporarily add `import './styles/tailwind-scratch.css'` to `main.tsx`
   and use the component in a scratch route/render to see it working as the
   registry intended. Tailwind's plugin is still wired up, so this Just Works.
3. Convert it to the project convention: move to
   `ui/<component>/<component>.tsx` + `<component>.module.css`, translate
   the class strings to module classes and `var()` tokens, compose animations
   from `motion.module.css`, resolve any `dark:` variant to its dark value.
4. Remove the scratch import from `main.tsx`.
5. `yarn check` — `scripts/no-tailwind.mjs` fails on any class string left
   behind, which is the mechanical gate that the conversion is complete.

Anything the registry adds to `components.json`'s `css` target lands in
`tailwind-scratch.css`; port genuinely new tokens from there into
`tokens.css` by hand.

---

## Resuming this plan in a fresh session

**Resume at Part 6.7 (`ShortcutsDialog`).** Phases 0–5 and Parts 6.1–6.6 are
done.
Read "Progress so far" above (the facts that carry forward) and the
Conventions section before writing any CSS. Each remaining part lists its
own importers/notes/browser-verification inline; nothing else needs to be
re-derived.

**Working agreements:**
- A part, not a phase, is the unit of work: convert it, `yarn check`,
  live-verify with Playwright (`getComputedStyle`/DOM checks against a
  scratch dev server — this migration is visual, and typecheck/lint/tests
  alone have missed every real bug found so far), write the part's Status
  note into this file, hand the user its browser-verification list, stop at
  the ⏸. Each part lands as its own commit — **by the user**, not the agent.
- **Never run `git commit` unless the user says so in the moment.** Not at a
  wrap-up, not because a part finished.
- **The user does the general manual click-through QA pass** (each part's
  "Browser verification (you)" list is written for them) — hand it over and
  stop. Narrower carve-out: if the user reports a bug, a fix is applied, and
  they report the *same* bug persists, don't reason about it from first
  principles a second time — check `getComputedStyle`/DOM state directly
  with Playwright and confirm the fix numerically before reporting it fixed
  again.
- Use Playwright (a devDependency), not the `mcp__claude-in-chrome__*`
  tools, for scripted verification — faster for `getComputedStyle`/DOM
  checks. Write throwaway scripts inside the project directory (Yarn's
  `node-modules` linker means a script outside the repo can't resolve
  `import { chromium } from 'playwright'`), run with `node`, delete when
  done. Kill any scratch dev server started when finished.
- **Pause at every ⏸.** Do not roll into the next phase without review.
- If the user asks for a deviation mid-execution, implement it directly and
  update this plan file's record — don't ask first, and don't leave the
  plan describing what was originally decided rather than what shipped.
- Don't report something "fixed" or "verified" from reasoning alone when a
  cheap empirical check is available.
- The user prefers options over a single recommendation, and interview-style
  questions one at a time.
- Run typecheck, lint **and** tests — none catches the others' failures.

**Behavior that must not be disturbed** (all documented in
`TECHNICAL_DESIGN.md`'s "Known Gotchas" — read before touching drag-and-drop,
dialogs, or keyboard shortcuts):

- `LinkTile`'s **inline `style` object** (dnd-kit's `transform`/`transition`,
  the combined opacity transition, `viewTransitionName`). An inline style
  always beats a class for the same property.
- `DashboardGrid`'s **CSS Grid container + `closestCenter`**. Correctness
  code wearing styling clothes — a `flex flex-wrap` container broke
  `rectSortingStrategy` for cross-row moves originally.
- `useClosingDialog`'s **local-`open` + `onOpenChangeComplete` contract** —
  it's why exit animations play at all.
- `Tabs.List`'s `activateOnFocus: false` and the **capture-phase
  `stopPropagation`** in `useKeyboardShortcuts` that beats its roving focus.
- The **held-⌥ digit badges must not reflow the tab strip** (PRD requirement).
- `AlertDialogAction` **does not auto-close** in Base UI; consumers close
  themselves in `onClick`.
- `aspect-ratio.tsx`'s hand-applied `{...style, '--ratio': ratio}` merge.
- **`Button`'s `sizeIconXs`/`sizeIconSm` set `position: relative` directly**
  in their own nested rule. A consumer needing the whole button absolutely
  positioned within its own layout uses the `positioned` prop
  (`.button--positioned`), not a raw override.
- **`tcm -c` and `vite.config.ts`'s `localsConvention: 'camelCaseOnly'`
  must change together, never one without the other** — a change to one
  without the other is a silent, type-checked-away mismatch between the
  generated `.d.ts` and Vite's actual runtime export.

**Reference docs:** `docs/PRD.md` (product behavior — the visual contract
this migration must preserve), `docs/TECHNICAL_DESIGN.md` (stack, gotchas,
testing focus), `docs/DATA_FORMATS.md` (untouched by this work), `docs/BEM.md`
(the methodology this plan's "Class naming and structuring" convention
applies), `AGENTS.md` (commands, comment style, plan conventions).

