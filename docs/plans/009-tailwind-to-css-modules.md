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

## Decisions already made

| Question | Decision |
|---|---|
| Test file location | Top-level `tests/`, mirroring `src/`'s subfolders; `setup.ts` + `testDb.ts` → `tests/support/`. `src/` ends with zero test files. |
| Component folder shape | Folder named after the component, files inside share that name, **no barrel** — `components/ui/button/{button.tsx,button.module.css}`, imported as `@/components/ui/button/button`. |
| Design tokens | One global `src/styles/tokens.css` holding the existing color/radius/motion vars **plus** explicit vars for the scales Tailwind implied (spacing, font size, line height, font weight, shadow, z-index). Modules reference `var()`, not magic numbers. |
| Tokens/styling with no call site in this app yet (`--sidebar-*`, `--chart-*`, a component's disabled-state or nested-context rules, etc.) | **Kept, ported faithfully, no comments calling it out.** These are full-featured components; parity means porting the whole component, not just the parts this app's current call sites happen to exercise. |
| Scale token naming | **Named tiers, not numeric/abbreviated, for every scale.** Applies to `space` (`--space-3x-small` … `--space-5x-large`, `0.125rem`→`2.5rem`), `text` (`--text-x-small/small/medium/large`, replacing Tailwind's `xs/sm/base/lg`), `radius` (`--radius-small/medium/large/x-large/2x-large/3x-large/4x-large`, replacing `sm/md/lg/xl/2xl/3xl/4xl`), and `shadow` (`--shadow-small/large/x-large`, replacing `sm/lg/xl`) — the `small…large` + `Nx-` prefix vocabulary is the one naming convention for every scale in `tokens.css`. `font-weight` keeps its CSS-spec names (`normal/medium/semibold`) since those are already semantic, not numeric. Component spacing/sizing is snapped to the nearest defined tier rather than adding a token per exact pre-migration pixel value — see Phase 2 status notes for the mapping. |
| Light theme / `dark:` variants | **Collapsed to dark-only.** Every `dark:` override resolves to its winning (dark) value; light `:root` values are discarded; dark values are flattened into `:root`. |
| `<html class="dark">` | **Kept** (amended — the original decision dropped it). Harmless once tokens are flattened into `:root`, and required for the retained shadcn scratch path to preview registry components correctly. |
| CSS reset | Andy Bell's modern reset, verbatim (supplied by the user — see Phase 1). |
| Variant API | **Keep `cva`**, feeding it CSS Module class names; `VariantProps<>` keeps deriving prop types. |
| `cn()` helper | **Unchanged** — `clsx` + `tailwind-merge` both stay. `twMerge` passes hashed module class names straight through, so it is a harmless no-op for converted components, and it stays useful on the shadcn scratch path. |
| Tailwind / shadcn packages | **Not removed.** Decommissioned from the runtime only (see Phase 8). |
| Animations | One shared `src/styles/motion.module.css` holding the keyframes and the two tempo classes; popups pull them in with CSS Modules `composes:`. No global animation class names. |
| CSS Module typing | Generated `.d.ts` per module via `typed-css-modules` (`tcm`), gitignored, regenerated before `tsc` in the mechanical check. |
| Mechanical check | `css:types` → `lint` → `stylelint` → `tsc -b` → `test`, wrapped as `yarn check`, plus a Tailwind-residue grep. No `yarn build` (not selected). |
| Phase granularity | Grouped by tier, 9 phases (0–8). **Amended:** from Phase 3 on, a phase is *not* a unit of work — each phase is broken into **parts, one component per part**, and a part is the unit that gets its own `yarn check`, its own browser pass, its own ⏸ pause, and its own commit. Phase 2 already shipped this way (6 parts / 6 commits) before the plan said so; Phases 3–7 now say so up front. A phase is done when its last part is. |
| Class structuring methodology | **BEM (Block/Element/Modifier), per `docs/BEM.md`, enforced by `@jeremywalton/stylelint-bem`.** **Supersedes the camelCase-adapted version below** — CSS source is now literal kebab-case BEM (`.button`, `.button--outline`, `.kbd-group`), the real `__`/`--` separators, not a camelCase-flattened stand-in. `tcm -c`/`--camelCase` (`css:types` script) and Vite's `css.modules.localsConvention: 'camelCaseOnly'` (`vite.config.ts`) convert every class to a camelCase JS property (`.button--size-icon-xs` → `styles.buttonSizeIconXs`), so `.tsx` call sites still read as camelCase even though the `.css` source doesn't. See Phase 2 status notes for why the plain-camelCase version didn't survive contact with a deterministic linter. |

## Conventions

**Native CSS nesting.** Every module uses native CSS nesting (Chrome-only
app, no build-time downleveling needed) rather than flat repeated
selectors: a class's own pseudo-classes/pseudo-elements/`:has()`/`:global()`
states nest inside its own rule via `&`, and a class's own descendant
selectors (`svg { … }`, `::before { … }`) nest as bare selectors. Compiles
to the exact same flat CSS either way — confirmed with Playwright
(`getComputedStyle`) that behavior is byte-identical before/after nesting
`button`/`badge`/`kbd`/`label`/`separator`/`input` in Phase 2, and every
converted module since fully nests, with no exceptions left standing:
`badge`'s variant/size modifiers (`&.badge--default`, …) all nest inside
`.badge { }` (an earlier draft of this note claimed they didn't — wrong,
corrected during the Part 3.4 review), and `button`'s former `@layer base`
escape hatch (also described here as an exception) is gone entirely — see
Part 3.4's Status note and the `positioned` prop. A multi-block file
(`dropdown-menu`, `dialog`, `alert-dialog`, …) nests each block's own
modifiers inside *that block's* rule the same way; reaching into a
*different* block (an ancestor-context selector, or the cross-component
pattern below) still nests, just rooted at the reaching block's own `&`.

**Class naming and structuring (BEM).** Every module is structured per
`docs/BEM.md`'s Block/Element/Modifier methodology, written as **real
kebab-case BEM** — literal `__`/`--` separators, not a camelCase stand-in
(see "Superseded: camelCase-flattened BEM" below for why):

- **Block** — the module's root class, generally matching the component's
  own name (`LinkTile.module.css`'s `.tile`, `dialog.module.css`'s
  `.dialog`).
- **Element** — a child class nested inside its block via native CSS
  nesting, one level flat (`.tile__header`, never
  `.tile__header__title` — flatten to `.tile__title`).
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
tooltip-nesting or `label`'s peer/group-disabled) are **not** BEM modifiers
and are left as plain selectors — they don't use the configured separators,
so the plugin ignores them entirely, and there's no component prop to drive
a modifier class from for genuinely external/native state.

Keeping JS ergonomic despite kebab-case CSS: `package.json`'s `css:types`
script runs `tcm` with `-c`/`--camelCase`, and `vite.config.ts` sets
`css.modules.localsConvention: 'camelCaseOnly'` — both convert
`.button--size-icon-xs` to the single JS property `buttonSizeIconXs`, so
`.tsx` files reference `styles.buttonSizeIconXs`, never bracket-notation
kebab-case. The two must stay in lockstep (same conversion in both, not
just one) or `tcm`'s generated `.d.ts` and Vite's actual runtime export
silently disagree on key names.

### Superseded: camelCase-flattened BEM

Phase 2 originally shipped `docs/BEM.md` adapted to flatten BEM into bare
camelCase classes with no real separators (`.default`, `.sizeXs`, a
modifier being "a composed sibling class... never a literal `--` suffix").
That version is **wrong** — a bare `.default` sibling class is
indistinguishable from a modifier "floating free" of anything it modifies
(exactly BEM.md's "Orphaned Modifiers" mistake), and it can't be checked
mechanically at all: `@jeremywalton/stylelint-bem`'s rules only recognize
class names using the configured `__`/`--` separators — a flat camelCase
class is invisible to it, indistinguishable from a utility class. Installed
the plugin, rewrote `button`/`badge`/`kbd`/`separator`/`aspect-ratio` to
real kebab-case BEM class names, and only then did the tooling
(`tcm -c`, `localsConvention: 'camelCaseOnly'`) come into the picture, to
recover camelCase JS property access without reintroducing the ambiguity in
the CSS source itself.

**Token usage.** Every color, radius, easing, duration, spacing, font size,
shadow and z-index in a module is `var(--token)`. Literal values are allowed
only for one-off geometry that has no scale equivalent (e.g. `16 / 9`,
`-1px`).

**Translating a Tailwind `<color>/<alpha>` modifier.** For a token whose own
value is fully opaque (`--primary`, `--destructive`, `--ring`, `--muted`,
etc.), `bg-foo/40` becomes `oklch(from var(--foo) l c h / 40%)` — a straight
alpha substitution, confirmed byte-identical to Tailwind's own output via
Playwright (`getComputedStyle`) for several of these. **But `--border` and
`--input` are themselves already translucent** (`oklch(100% 0 0deg / 10%)`
and `/ 15%` respectively) — for those two, Tailwind can't algebraically
substitute an alpha it doesn't know at build time, so it compiles
`bg-input/50` to `color-mix(in oklab, var(--input) 50%, transparent)`
instead, which *multiplies* the existing alpha (15% × 50% = 7.5%), not
overrides it. Using the `oklch(from …)` substitution on `--border`/`--input`
silently produces a far more opaque, visibly-wrong result (confirmed as a
real bug in `input`'s and `button`'s Phase 2 conversion — see status notes).
Rule: `--border`/`--input` always translate to `color-mix(in oklab,
var(--token) N%, transparent)`; every other (opaque) token uses `oklch(from
var(--token) l c h / N%)`.

**Cross-component styling (the `group-hover:` translation).** Tailwind's
`group`/`group-hover:` pairs span component boundaries — e.g. `LinkTile`'s
outer `div.group` styling the `AspectRatio` it renders. This is the one
place BEM's "an element only belongs to its own block" rule doesn't apply
cleanly, since `AspectRatio` is itself a separate block (its own component)
rather than an element of `LinkTile`. The CSS Modules equivalent is to keep
*both* classes in the *parent's* module and pass the child one down as a
`className` prop — the parent block reaching into a child block it composes,
not a same-block element reference:

```css
/* LinkTile.module.css */
.tile:hover .surface { box-shadow: var(--shadow-x-large); }
```
```tsx
<div className={styles.tile}>
  <AspectRatio className={styles.surface} … />
```

**Base UI state selectors.** `data-open` / `data-closed` / `data-side` /
`data-slot` attributes stay on the elements exactly as they are today; only
the selector syntax changes (`data-open:animate-in` → `.content[data-open]
{ animation: … }`). Do not remove any `data-slot` attribute — several are
load-bearing for descendant selectors.

**Reduced motion.** The `--tw-enter-*` zeroing hack in `index.css` exists
only because tw-animate-css drives those variables; it disappears with
Tailwind. Each module that animates carries its own
`@media (prefers-reduced-motion: reduce)` block, and every `motion-safe:`
press-feedback transform becomes an explicit
`@media (prefers-reduced-motion: no-preference)` block. The `scale: 1`
containing-block gotcha in `TECHNICAL_DESIGN.md` becomes moot — nothing sets
`scale` on a universal selector anymore.

## Mechanical check

Added in Phase 1, run at the end of **every part** (see Decisions, "Phase
granularity"):

```json
"css:types":   "tcm src -p \"**/*.module.css\"",
"stylelint":   "stylelint \"src/**/*.css\"",
"no-tailwind": "node scripts/no-tailwind.mjs",
"check":       "yarn css:types && yarn lint && yarn stylelint && yarn no-tailwind && tsc -b && yarn test"
```

`css:types` must run before `tsc -b` — the generated `.d.ts` files are what
make `styles.foo` type-check.

`scripts/no-tailwind.mjs` holds a `MIGRATED` array of globs that grows one
entry per **part**. It scans those files for string literals containing tokens
matching Tailwind utility patterns and exits `1` with `file:line` on any hit:

```
/\b(flex|grid|block|hidden|inline-flex|absolute|relative|fixed|sticky)\b/
/\b-?(p|m|w|h|gap|size|inset|top|right|bottom|left|space|min-w|max-w)-[\w./[\]-]+/
/\b(text|bg|border|ring|shadow|rounded|font|opacity|z|order|aspect)-[\w./[\]-]+/
/\b(hover|focus|focus-visible|active|disabled|group-hover|motion-safe|dark|sm|md|lg|data-\[[^\]]+\]|data-open|data-closed|has|supports|\*\*):/
/\b(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-\w+-\d|motion-dialog|motion-popup|transition|duration-\d+|ease-[\w-]+)\b/
```

In Phase 8, `MIGRATED` is replaced with `['src/**/*.tsx', 'index.html']`.

---

## Phase 0 — Separate tests from source

**Scope:** no styling changes; pure move.

1. Create `tests/` mirroring `src/`'s structure:
   - `src/test/setup.ts` → `tests/support/setup.ts`
   - `src/test/testDb.ts` → `tests/support/testDb.ts`
   - `src/lib/url.test.ts` → `tests/lib/url.test.ts`
   - `src/lib/keyboard.test.ts` → `tests/lib/keyboard.test.ts`
   - `src/lib/importExport.test.ts` → `tests/lib/importExport.test.ts`
   - `src/hooks/useAltHeld.test.ts` → `tests/hooks/useAltHeld.test.ts`
   - `src/hooks/useKeyboardShortcuts.test.ts` → `tests/hooks/useKeyboardShortcuts.test.ts`
   - `src/components/LinkEditModal.test.tsx` → `tests/components/LinkEditModal.test.tsx`
   - `src/context/AppStateContext.test.tsx` → `tests/context/AppStateContext.test.tsx`
   - delete the now-empty `src/test/`
2. Rewrite every import inside the moved tests to the `@/` alias rather than
   relative paths (`'../storage/db'` → `'@/storage/db'`,
   `'../test/testDb'` → `'./support/testDb'` style becomes
   `'../support/testDb'`). This makes the tests location-independent.
   **Watch:** `vi.mock('@/storage/db')` must resolve to the same module id as
   the source file's own import — it does, since Vite's alias resolves both
   to the same absolute path, but a mock that silently stops applying shows
   up as a test hitting real IndexedDB in jsdom (it will hang or throw, not
   pass quietly).
3. `vite.config.ts`: `setupFiles: './tests/support/setup.ts'`.
4. `tsconfig.app.json`: add `"tests"` to `include` so the moved files are
   still type-checked. (Alternative considered: a separate
   `tsconfig.test.json` project reference — rejected, `tsc -b` would need
   `composite: true` on projects that don't have it today.)
5. `.github/workflows/ci.yml` / `deploy.yml`: no change needed yet (they call
   `yarn test`, which reads `vite.config.ts`).

**Mechanical check:** `yarn lint && tsc -b && yarn test` — all 81 tests must
still pass, same count.

**Status: done.** `yarn lint`, `tsc -b`, and `yarn test` (7 files, 81 tests,
same count) all pass clean. Not yet committed.

**Browser verification (you):** none needed — no runtime code changed. A
`yarn dev` smoke load is enough to confirm nothing was moved that shouldn't
have been.

⏸ **PAUSE — review before Phase 1.**

---

## Phase 1 — Foundations: tokens, motion, reset, tooling

**Scope:** new files only + build config. No component is converted yet, so
the app renders identically (Tailwind still supplies everything).

1. Add devDependencies: `typed-css-modules`, `stylelint`,
   `stylelint-config-standard`.
2. `src/styles/tokens.css` — port from `index.css`:
   - the **dark** values of every `:root`/`.dark` var, flattened into a single
     `:root` block (light values discarded per the dark-only decision);
     `--sidebar-*` and `--chart-*` kept as-is
   - `--radius` + the `--radius-small…4x-large` calc chain
   - `--ease-out-strong`, `--ease-in-out-strong`
   - **new**: `--space-3x-small … --space-5x-large` (a named scale, not
     Tailwind's numeric multiples — see Decisions),
     `--text-x-small/small/medium/large` + line heights,
     `--font-weight-medium/semibold`,
     `--shadow-small/large/x-large`, `--z-popup: 50`, and the two font stacks
     (`--font-sans`, `--font-heading`)
   - Derive each new value by reading it off the current Tailwind output, not
     from memory — `yarn dev` + devtools computed styles on a real element.
3. `src/styles/global.css` — the non-token global layer:
   - `@import` the two `@fontsource-variable` packages (unchanged)
   - `@import './tokens.css'`
   - **the reset replacing Tailwind's preflight**, verbatim as supplied:

```css
/* Box sizing rules */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Prevent font size inflation */
html {
  -moz-text-size-adjust: none;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}

/* Remove default margin in favour of better control in authored CSS */
body, h1, h2, h3, h4, p,
figure, blockquote, dl, dd {
  margin-block-end: 0;
}

/* Remove list styles on ul, ol elements with a list role, which suggests default styling will be removed */
ul[role='list'],
ol[role='list'] {
  list-style: none;
}

/* Set core body defaults */
body {
  min-height: 100vh;
  line-height: 1.5;
}

/* Set shorter line heights on headings and interactive elements */
h1, h2, h3, h4,
button, input, label {
  line-height: 1.1;
}

/* Balance text wrapping on headings */
h1, h2,
h3, h4 {
  text-wrap: balance;
}

/* A elements that don't have a class get default styles */
a:not([class]) {
  text-decoration-skip-ink: auto;
  color: currentColor;
}

/* Make images easier to work with */
img,
picture {
  max-width: 100%;
  display: block;
}

/* Inherit fonts for inputs and buttons */
input, button,
textarea, select {
  font-family: inherit;
  font-size: inherit;
}

/* Make sure textareas without a rows attribute are not tiny */
textarea:not([rows]) {
  min-height: 10em;
}

/* Anything that has been anchored to should have extra scroll margin */
:target {
  scroll-margin-block: 5ex;
}
```

   - **Deltas from Tailwind preflight to watch for** — this reset is
     deliberately lighter, and these four gaps are real:
     1. `margin-block-end: 0` only; preflight zeroes margin on **all** sides.
        Default `margin-block-start` survives on `h1`–`h4`/`p`/`body`.
        Modules must set their own top margins rather than assume zero.
     2. `button`/`input` inherit `font-family`/`font-size` but **not**
        `color`, and get no `background: transparent` or border reset —
        preflight supplied all three. `ui/button` must set `color`,
        `background` and `border` explicitly on every variant (it largely
        already does).
     3. Headings keep their UA font sizes and bold weight; preflight
        normalized them to inherit. Set sizes explicitly wherever a heading
        is used (dialog titles, empty-state title).
     4. `body { line-height: 1.5 }` and `button/input { line-height: 1.1 }`
        are opinionated values preflight didn't impose — a fixed-height
        button with centered content is unaffected, but check anything
        relying on line-height for vertical rhythm.
   - `body { background/color/-webkit-font-smoothing }`, `html { font-family }`
   - the `::view-transition-*` rules, moved verbatim (they are genuinely
     global and cannot live in a module)
4. `src/styles/motion.module.css` — keyframes + the two tempo classes:
   - `@keyframes fadeIn/fadeOut`, `popIn/popOut` (opacity + `scale`),
     and the eight `slideIn*` directional variants
   - `.dialog[data-open]` 200ms / `.dialog[data-closed]` 150ms
   - `.popup[data-open]` 150ms / `.popup[data-closed]` 100ms, plus
     `.popup[data-side="top"]`, `[data-side="bottom"]`, `[data-side="left"]`,
     `[data-side="right"]`, `[data-side="inline-start"]`,
     `[data-side="inline-end"]` slide offsets
   - `.popup[data-state="delayed-open"]` (tooltip's extra state)
   - a `@media (prefers-reduced-motion: reduce)` block dropping the transform
     halves, keeping the opacity fades
   - **Watch:** `composes:` puts *both* class names on the element, so cascade
     order between `motion.module.css` and the consuming module decides ties.
     Keep the shared module free of anything a consumer would want to
     override (colors, sizing) — animation properties only.
5. `main.tsx`: import `./styles/global.css` (keep the `index.css` import
   alongside it for now — both load, no conflict).
6. `index.html`: **leave `class="dark"` in place permanently.** With tokens
   flattened into `:root` it selects nothing of ours, but registry components
   pulled in later via `shadcn add` emit `dark:` variants that need it to
   preview correctly.
7. `stylelint.config.js` — `extends: ['stylelint-config-standard']`, with
   `selector-class-pattern: '^[a-z][a-zA-Z0-9]*$'` (camelCase locals) and
   `custom-property-pattern` relaxed for the existing token names.
8. `.gitignore`: add `*.module.css.d.ts`.
9. `eslint.config.js`: add `'**/*.module.css.d.ts'` to `globalIgnores`.
10. `package.json`: add the four scripts from "Mechanical check" above.
11. `.github/workflows/ci.yml` and `deploy.yml`: replace the
    `lint`/`tsc`/`test` step trio with `yarn check`. **Required now, not
    later** — from Phase 2 onward CI fails without `css:types` running first.
12. `scripts/no-tailwind.mjs` with `MIGRATED = []`.

**Mechanical check:** `yarn check` (passes trivially — `MIGRATED` is empty).
Also confirm `yarn css:types` runs clean on `motion.module.css` and emits a
`.d.ts` beside it, including for `composes:` targets.

**Status: done.** `yarn check` passes (81 tests, same count). Notes for
whoever converts a component that consumes these files next:
- `motion.module.css` ended up with **4** cardinal `slideInFrom*` keyframes
  (top/bottom/left/right), not eight — the six `data-side` values map onto
  those four (`inline-start`/`inline-end` reuse `right`/`left`, matching the
  actual Tailwind classes on `tooltip.tsx`/`dropdown-menu.tsx` today, grepped
  rather than assumed). `slide-out-to-*` isn't used anywhere in the current
  app (exits are fade+zoom only), so no exit-slide keyframes were added.
- `.dialog[data-open]`/`[data-closed]` in the shared module set only
  `animation-duration`/`animation-timing-function` — no `animation-name`,
  since the overlay (fade only) and content (fade+zoom) need different
  keyframes. Each Phase 3 consumer module supplies its own `animation-name`
  (`fadeIn`/`fadeOut` for the overlay, `popIn`/`popOut` for content); this is
  exactly the documented cascade-order risk ("Watch" note above) — Phase 3's
  browser pass must confirm it resolves correctly, especially the
  reduced-motion override.
- `.popup[data-open]`/`[data-closed]` **do** fully bake in `animation-name`
  (`popIn`/`popOut`, plus a slide keyframe layered in per `data-side`) since
  every popup consumer (tooltip, dropdown, dropdown submenu) wants identical
  behavior — no per-consumer override needed there.
- Added `.stylelintignore` (`src/index.css`) and per-line
  `stylelint-disable` comments on the reset's two vendor-prefixed
  `text-size-adjust` declarations — not in the original phase text, but
  required: `stylelint "src/**/*.css"` chokes on Tailwind's `@theme`/
  `@utility`/`@apply` at-rules (`at-rule-no-unknown`, on by default in
  `stylelint-config-recommended`), and its `--fix` collapsed the three
  vendor-prefixed `text-size-adjust` lines into three duplicate unprefixed
  ones, silently defeating the reset's actual purpose. Watch for this again
  in Phase 7 — `tailwind-scratch.css` will need the same ignore-list entry.
- `--font-weight-normal: 400` was added alongside the decision table's
  `medium`/`semibold` since `font-normal` is used in the codebase today
  (`grep font-normal`) and there's no reason to leave that one magic number
  unconverted.

**Browser verification (you):** the app should look **pixel-identical** to
before — nothing has been converted. What you're checking is that the new
reset didn't fight preflight: scroll the grid, open a dialog and a dropdown,
check that button/input fonts and image sizing are unchanged.

⏸ **PAUSE — review before Phase 2.**

---

## Phase 2 — Leaf `ui/` primitives (7 components, shipped in 6 parts)

**Scope:** the primitives with no dependency on other `ui/` files. Landed as
six commits (`1df5240`…`0645caf`), the last three being corrections rather
than new components — the per-part cadence that Phases 3–7 now state
explicitly started here, ad hoc.

`button`, `badge`, `kbd`, `label`, `input`, `separator`, `aspect-ratio`

For each: create `src/components/ui/<name>/<name>.tsx` +
`<name>.module.css`, delete the old flat file, update every importer.

Per-component notes:

- **button** — the largest CVA in the codebase: 6 variants × 8 sizes. The
  `motion-safe:active:not-aria-[haspopup]:scale-[0.96]` press feedback becomes
  a `@media (prefers-reduced-motion: no-preference)` block with
  `.button:active:not([aria-haspopup])`. The `icon-xs`/`icon-sm` sizes carry a
  `::before { inset: -0.5rem }` hit-area expansion — preserve it, it is a
  deliberate, documented affordance. `[&_svg:not([class*='size-'])]:size-4`
  becomes `.button svg:not([data-sized]) { … }` or a plain `.button svg`
  default that consumers override — pick one and apply it consistently across
  all sizes.
- **badge** — keep the `overlay` variant (LinkTile's title pill).
- **aspect-ratio** — the registry file already carries a hand-applied
  `style` merge fix (`{...style, '--ratio': ratio}`); carry it forward, and
  drop the "reapply after `shadcn add --overwrite`" note since regeneration
  is no longer possible (see Risks).
- **input / label / separator / kbd** — small, mostly a direct transcription.

Importers to update in this phase: `field.tsx` (label, separator),
`dialog.tsx` / `alert-dialog.tsx` (button), plus every app component that
imports `./ui/button|badge|kbd|input|label|separator|aspect-ratio`.

`scripts/no-tailwind.mjs`: add `src/components/ui/{button,badge,kbd,label,input,separator,aspect-ratio}/**`.

**Mechanical check:** `yarn check`.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **`scripts/no-tailwind.mjs` needed real fixes, not just new `MIGRATED`
  entries**, discovered by running it against the actual converted output
  rather than assuming the Phase 1 script was correct: (1) each glob now
  ends `/**/*.tsx` instead of `/**` — the bare form matched `.module.css`
  and generated `.d.ts` files too, and real CSS is full of false positives
  against these regexes (`border-radius`, `inline-flex`, `flex-shrink`,
  `font-size`, `:active`, `transition-property`, … all contain substrings
  the patterns are hunting for). This matches Phase 8's own final
  `MIGRATED = ['src/**/*.tsx', 'index.html']` — CSS was never meant to be
  scanned, only `.tsx`. (2) Lines matching `^\s*(import|export)\b.*\bfrom\b`
  are skipped — a converted file's own `import styles from
  './foo.module.css'` line trips the same collision. (3) Dropped bare
  `sm|md|lg` from the variant-colon pattern — no *Phase 2* file used a real
  `sm:`/`md:`/`lg:` breakpoint variant (confirmed by grep at the time), and
  bare `sm:`/`lg:` as a CVA size key (`sm: styles.sizeSm`) is otherwise
  indistinguishable from one. **Correction (Part 3.3):** this was true only
  of the seven Phase 2 files, not the whole app — `dialog.tsx`/
  `alert-dialog.tsx` do use real `sm:` breakpoints, ported as real
  `@media (width >= 40rem)` rules in `dialog.module.css`/
  `alert-dialog.module.css` (see Part 3.3's Status note). This doesn't
  reopen the regex gap in practice, since `no-tailwind.mjs` only scans
  `.tsx` files and these live in `.module.css`, but the original "this app
  has no responsive breakpoints post-migration" framing was an overclaim
  and is corrected here rather than left standing. (4) `aspect-` now
  excludes the literal suffix
  `ratio` via a negative lookahead — `aspect-ratio` is the CSS property name
  and this project's own `data-slot` value, never a real Tailwind aspect
  utility (`aspect-auto/square/video/<number>/[value]`). None of these
  narrow the check's ability to catch genuine unconverted Tailwind in a
  later phase — verified by re-running it after each fix and confirming it
  still flags real hits before the fix, zero after.
- **`button` svg sizing**: went with the plain default (`.button svg { … }`,
  overridden per-size-variant by cascade order later in the same file), not
  the `:not([data-sized])` escape hatch — grepped every icon call site in
  the app and none passes an explicit size override today, so the escape
  hatch would be unexercised. Applied the same plain-default approach to
  `kbd`/`badge` for consistency.
- **`separator`**: ported `[data-orientation="…"]` sizing using the correct,
  standard Base UI attribute name (verified against `@base-ui/react`'s own
  source) rather than Tailwind's literal `data-horizontal`/`data-vertical`
  class names, which never corresponded to a real DOM attribute.
- Used `oklch(from var(--x) l c h / N%)` (CSS relative color syntax) as the
  standard translation for every Tailwind `<color>/<alpha>` modifier
  (`bg-primary/80`, `ring-ring/30`, etc.) — exact and requires no new tokens.
- All `dark:` overrides were resolved to their winning (dark) value per the
  Decisions table, e.g. `badge`'s destructive variant ended up
  `oklch(from var(--destructive) l c h / 20%)` background (the `dark:`
  value), not the light-mode `/10%` in the original source.
- **Spacing scale**: `tokens.css` uses the named scale from the Decisions
  table (`--space-3x-small` … `--space-5x-large`) instead of the numeric
  half-steps Phase 1 originally shipped. Every component's spacing was
  snapped to the nearest tier, rounding an in-between value up to the next
  full tier (e.g. Tailwind's `gap-1.5`/0.375rem → `--space-x-small`/0.5rem,
  `px-2.5`/0.625rem → `--space-small`/0.75rem) rather than adding a token
  per exact pixel value. `button`'s literal `2.25rem`/`2.5rem` heights
  (`h-9`/`size-9` and `h-10`/`size-10`, previously left as literals since
  they exceeded the old numeric scale) are now `--space-4x-large` and
  `--space-5x-large` — the extended scale covers them natively.
- **Every other scale in `tokens.css` renamed to match** (`text`, `radius`,
  `shadow`): `--text-xs/sm/base/lg` → `--text-x-small/small/medium/large`,
  `--radius-sm/md/lg/xl/2xl/3xl/4xl` → `--radius-small/medium/large/
  x-large/2x-large/3x-large/4x-large`, `--shadow-sm/lg/xl` →
  `--shadow-small/large/x-large`. `font-weight` was left alone
  (`normal/medium/semibold` are already semantic, not numeric). All
  converted components (`badge`, `button`, `kbd`, `input`, `label`) updated
  to the new names — no value changes here, since these tokens' values were
  already exact matches at every call site (unlike `space`, nothing needed
  snapping to a different tier).
- **Bug found in browser testing (twice — the first fix was wrong), now
  actually fixed**: `button`'s `sizeIconXs`/`sizeIconSm` set
  `position: relative` (needed for the `::before` hit-area trick) as a
  plain CSS Module rule. Several not-yet-converted consumers (`dialog.tsx`'s
  close button, `EntityOptionsMenu`'s kebab trigger used by both
  `DashboardTabs` and `LinkTile`) pass a Tailwind `absolute` utility class
  expecting to override that. Root cause is **not** specificity — it's CSS
  Cascade Layers. `@import "tailwindcss"` wraps every generated utility in
  `@layer theme, base, components, utilities;`, and *unlayered* CSS always
  beats *any* layered CSS regardless of specificity (that's the layer tier
  of the cascade, checked before specificity). Plain CSS Module rules are
  unlayered, so `.sizeIconXs`'s `position: relative` was unconditionally
  beating Tailwind's layered `.absolute`, no matter what. My first attempt
  (wrapping the declaration in `:where(.sizeIconXs)` for zero specificity)
  had no effect, because the fight was never at the specificity tier —
  confirmed by inspecting `getComputedStyle(...).position` live in a
  browser both before and after that change, still `"relative"` either way.
  The actual fix: put the declaration in `@layer base` — reusing Tailwind's
  *own* `base` layer name (already registered lower than `utilities` by
  its layer-order statement), so it now loses to any Tailwind utility for
  the same property, exactly like an unlayered author style is supposed to
  be beatable by nothing except `!important`/inline styles, while a
  same-named-layer rule sorts into Tailwind's own precedence order. Verified
  live: `position` computed as `"absolute"` for both the dialog close
  button and the dashboard-tab kebab after this change, and confirmed
  visually (kebab centered in the pill, close button pinned top-right).
  This is a temporary, migration-period-only concern — it disappears
  entirely once Phase 8 removes Tailwind from the runtime, since there's no
  more layered utility CSS to lose to. Until then, watch for the same
  pattern in other converted modules: any CSS-Module rule setting a
  property that a not-yet-converted consumer overrides via a Tailwind
  utility class needs the same kind of fix.
  **Superseded (Part 3.4 review):** the `@layer base` escape hatch itself
  is gone, replaced with an explicit BEM modifier driven by a component
  prop — see that part's Status note for the full reasoning and the new
  `Button` `positioned` prop / `.button--positioned` modifier. The
  underlying cascade-layers diagnosis above is still accurate and still the
  right way to *think about* why a plain override would have lost; only the
  fix changed, from fighting Tailwind's layers to not needing an override
  at all (the consumer now asks for the behavior explicitly via a prop).
- **Lesson**: don't trust a plausible-sounding CSS cascade explanation
  without checking `getComputedStyle` in an actual browser — the
  specificity theory was reasonable-sounding and wrong, and shipping it
  without verification is exactly why the user caught it, not me.
- **Third bug found in browser testing**: `input`'s and `button`'s
  `bg-input/50` and `dark:hover:bg-input/30` were translated as
  `oklch(from var(--input) l c h / 50%)` / `/ 30%` — wrong, because
  `--input` is itself already translucent (`oklch(100% 0 0deg / 15%)`), so
  this substitution *overrode* the 15% alpha with 50%/30% instead of
  *multiplying* it, rendering input fields as a visibly light gray instead
  of the intended barely-there overlay. Verified Tailwind's actual compiled
  output for `bg-input/30` with Playwright: `color-mix(in oklab,
  var(--input) 30%, transparent)`, giving an effective alpha of 15%×30% =
  4.5% — confirmed byte-identical (`oklab(1 0 0 / 0.045)`) between
  Tailwind's own rule and the `color-mix()` replacement in a real page.
  Fixed both spots to use `color-mix(in oklab, var(--token) N%,
  transparent)`; see the new Conventions entry above ("Translating a
  Tailwind `<color>/<alpha>` modifier") — this is the general rule for
  `--border`/`--input` specifically, the only two tokens with their own
  embedded alpha, and needs rechecking anywhere else in later phases a
  `border/N` or `input/N` opacity modifier shows up (e.g. `tabs.tsx`'s
  `dark:data-active:bg-input/30` and `field.tsx`'s `has-data-checked:
  bg-input/30`, both still Tailwind-only, both due in later phases).
  Verification for this one used Playwright directly (per the user's
  request — faster than the chrome-extension tool for scripted
  computed-style checks) rather than the chrome MCP tools used for the
  previous two bugs.
- **Restructured to BEM per the user's `docs/BEM.md` addition and CVA
  example.** All variant/size modifier classes in `button` and `badge`
  (`.default`, `.outline`, `.sizeXs`, …) moved from separate top-level rules
  into compound `&.modifier` selectors nested inside the block's own rule
  (`.button { &.default { … } }`, matching `BEM.md`'s `.card { &.card--padded
  {} }` example) — every CVA variant class is always applied alongside its
  base class, so the compound selector is both accurate and gives modifiers
  natural specificity over the base without relying on source order.
  `kbd`'s `.group` (the `KbdGroup` sibling component's class) renamed to
  `.kbdGroup` per BEM's naming guidance (prefer a specific name). `separator`
  converted from relying on a `[data-orientation]` attribute selector to an
  actual `cva()` call driven by the `orientation` prop, with
  `orientationHorizontal`/`orientationVertical` modifier classes nested the
  same way — this incidentally **fixes** the sizing rule that was inert
  since Phase 2 started (the installed `@base-ui/react` version never
  rendered `data-orientation`; driving it from the prop instead of the
  attribute sidesteps that entirely). `label`, `input`, and `aspect-ratio`
  needed no structural change — `label`/`input` were already a single block
  with nested pseudo/attribute modifiers (no separate top-level modifier
  classes to fold in), and `aspect-ratio` has no modifiers at all.
  `:has([data-icon=…])` and the ancestor/sibling context selectors
  (`kbd`'s tooltip/input-group nesting, `label`'s peer/group-disabled) were
  **not** converted into explicit boolean CVA props — nothing in this app
  sets `data-icon`, and the ancestor/sibling versions depend on external
  DOM context the component doesn't receive as a prop, so there's no prop
  to drive a modifier class from; they stay as plain attribute/combinator
  selectors, which BEM doesn't have an opinion against for genuine
  native-state or child-content selectors (as opposed to variant styling
  the component's own code controls). Verified with Playwright: button
  variants (`Save`/`Cancel` colors), the `@layer base` position fix, and
  the newly-real separator orientation classes (created a test element
  with the actual hashed class names and confirmed
  `orientationHorizontal`/`orientationVertical` produce the right
  width/height/background) all still resolve correctly after the
  restructuring.
- **Superseded by the next entry below.** The bare-camelCase modifier names
  in this note (`.default`, `.sizeXs`, `.orientationHorizontal`, `.kbdGroup`)
  were replaced with real kebab-case BEM (`.button--default`,
  `.button--size-xs`, `.separator--horizontal`, `.kbd-group`) after
  installing `@jeremywalton/stylelint-bem` — see "Class structuring
  methodology" in Decisions and the Conventions section's "Superseded:
  camelCase-flattened BEM". The structural work described above (which
  rules got nested where) is still accurate; only the class name strings
  changed.
- **Installed `@jeremywalton/stylelint-bem`** (`yarn add -D
  @jeremywalton/stylelint-bem` — the plain npm registry install; an earlier
  attempt to install directly from its GitHub URL was unnecessary and
  needed a Yarn `approvedGitRepositories` entry plus a manual `dist/` copy
  to work around the package lacking a `prepare` build step for git-URL
  installs — reverted once the correct install command was pointed out).
  Registered all five rules in `stylelint.config.js`, converted
  `button`/`badge`/`kbd`/`separator`/`aspect-ratio` to real kebab-case BEM
  class names (see Conventions), and updated `selector-class-pattern` to
  accept the new `block[__element][--modifier]` shape. One `require-nesting`
  violation surfaced and was fixed: the `@layer base` position-fix escape
  hatch (`sizeIconXs`/`sizeIconSm`) used `:where(.button--size-icon-xs)` —
  a modifier not compounded with its block, which the rule correctly
  rejects. Fixed by using a direct compound selector
  (`.button.button--size-icon-xs`) instead — the `:where()` zero-specificity
  trick turned out to be unnecessary now that `@layer` (not specificity)
  is what makes the override work; layers are resolved before specificity,
  so the compound selector's higher specificity doesn't matter. Re-verified
  everything with Playwright after the rename (kebab/close-button position,
  input background alpha, button variant colors, separator orientation
  sizing, reduced-motion press feedback) — all unchanged from before the
  rename, as expected for a pure class-name refactor.

**Browser verification (you):**
- Every button variant: primary (dialog Save), outline, secondary (tile
  kebab), ghost, destructive (delete confirm), link (footer extension link)
- Button press feedback — the 0.96 scale on mousedown, and that it does
  *not* fire on the kebab (`aria-haspopup`)
- Focus rings via keyboard Tab through the top bar and a dialog
- The kebab's enlarged hit area — click 4–6px outside the visible button
- A link tile's title badge; `Untitled` on an empty title
- Tile aspect ratio holds at 16:9 while resizing the window
- `?` overlay's `kbd` chips, and the edit dialog's labels/inputs

⏸ **PAUSE — review before Phase 3.**

---

## Phase 3 — Composite `ui/` primitives (7 parts)

**Scope:** the primitives that import other primitives and/or animate.

`tooltip`, `dropdown-menu`, `dialog`, `alert-dialog`, `tabs`, `field`,
`empty` — **one per part, in that order.**

### Why this order

There is **no dependency constraint left inside this phase** — every
`ui/` file these seven import (`button` → dialog/alert-dialog, `label` +
`separator` → field) was already converted in Phase 2. So the order is
purely a risk ordering, and it is riskiest-first:

1. `tooltip` is the smallest file (64 lines) that consumes
   `motion.module.css`'s `.popup`, so it is the cheapest place to find out
   whether the `composes:` contract, the four-keyframe→six-`data-side`
   mapping, and the reduced-motion override actually work.
2. `dropdown-menu` (270 lines) is the same tempo class at full scale —
   worth doing while `.popup` is freshly proven, not last.
3. `dialog` is the first `.dialog` consumer, and carries the phase's single
   most likely visual break (centering translate vs. zoom).
4. `alert-dialog` is a near-clone of `dialog`; back-to-back keeps the
   pattern fresh.
5–7. `tabs`, `field`, `empty` don't animate at all — they're CVA and
   layout work, and are the safest thing to be doing last.

### Per-part rhythm (applies to all seven; not repeated below)

1. Create `src/components/ui/<name>/<name>.tsx` + `<name>.module.css`;
   delete the old flat `src/components/ui/<name>.tsx`.
2. Update **only that component's** importers (listed per part).
3. Add `src/components/ui/<name>/**/*.tsx` to `scripts/no-tailwind.mjs`'s
   `MIGRATED`.
4. `yarn check`.
5. Update this plan file with a **Status** note for the part.
6. Hand the part's browser-verification list to the user; ⏸ **stop.**

**Housekeeping, do this once at the start of Part 3.1:** the folders
`ui/{dialog,alert-dialog,dropdown-menu,tooltip,tabs,field,empty}/` already
exist containing nothing but an orphaned generated `<name>.module.css.d.ts`
with no `.module.css` beside it — leftovers from an earlier attempt, and
gitignored so they don't show in `git status`. Delete all seven `.d.ts`
files before starting, or `tsc` will type-check `styles.*` against class
names that no longer exist. (`dialog.module.css.d.ts`'s keys —
`dialogContent`, `dialogContentClose`, … — are the earlier attempt's naming
and are **not** a specification for this one.)

**Shared convention for this phase.** Each popup's content and backdrop
`composes:` the matching tempo class:

```css
.tooltip-content {
  composes: popup from '../../../styles/motion.module.css';
  background: var(--foreground);
  /* … */
}
```

**Color tokens have no `--color-` prefix** — `tokens.css` defines
`--foreground`, `--popover`, `--muted-foreground`, not `--color-foreground`.
(An earlier draft of this plan's example used `var(--color-popover)`; that
token does not exist. No converted module uses the prefixed form —
`grep -rn "var(--color-" src/` returns nothing, and it should stay that way.)

**Block naming for multi-part primitives.** These files each export many
parts (`Dialog`, `DialogOverlay`, `DialogContent`, `DialogHeader`, …), and
several of the parts that need styling have **no styled common ancestor**
to hang a block off — `Dialog` (Root) renders no element of ours at all.
Don't invent a phantom `.dialog` root just to make `.dialog__content` legal.
Name each independently-rendered part as its **own block**
(`.dialog-overlay`, `.dialog-content`, `.dialog-footer`), and use elements
only for things that genuinely live inside another part's markup in the same
file (`.dialog-content__close`). This is BEM.md's "a new block can be used
in tandem with an element to represent a new concept" applied literally, and
it keeps `stylelint-bem/no-orphaned-element` satisfiable without fiction.

---

### Part 3.1 — `tooltip`

**Importers:** `App.tsx` (`TooltipProvider`), `DashboardTabs.tsx`,
`OptionsMenu.tsx`.

Notes:

- **First real consumer of `motion.module.css`.** Read that file before
  starting — it was verified against this part's needs and it already
  supplies **everything tooltip animates**, so `tooltip.module.css` should
  declare **no** animation properties of its own, only appearance.
  Specifically, confirmed present:
  - `.popup[data-open]` / `[data-closed]` set duration, timing **and**
    `animation-name` (`popIn` / `popOut`).
  - Six `.popup[data-open][data-side='…']` rules layer a second keyframe on
    top (`animation-name: popIn, slideInFrom<Opposite>`), covering
    `top`/`bottom`/`left`/`right`/`inline-start`/`inline-end` with four
    keyframes — `inline-start`/`inline-end` reuse right/left, RTL not
    supported.
  - `.popup[data-state='delayed-open']` exists for tooltip's third state.
  - The `@media (prefers-reduced-motion: reduce)` block re-points **all** of
    the above at `fadeIn`/`fadeOut`.
  If you find yourself needing to re-declare one of these, stop — that's the
  cascade-order risk biting, and the fix belongs in `motion.module.css`, not
  here.
- The slide distance is `var(--space-x-small)` (0.5rem), against Tailwind's
  `slide-in-from-*-2` (0.5rem). Matches; no adjustment needed.
- Deep selectors: `**:data-[slot=kbd]:*` → `.tooltip-content
  [data-slot="kbd"] { … }`; `has-data-[slot=kbd]:pr-1.5` →
  `&:has([data-slot="kbd"])`.
- The `Arrow` is the bulk of the transcription: a base
  `translate-y-[calc(-50%-2px)] rotate-45` plus six `data-[side=…]` blocks.
  **Several carry Tailwind's `!` important** (`data-[side=left]:top-1/2!`
  etc.) because Base UI's positioner writes `top` as an *inline* style on
  the arrow — an inline style beats any class, layered or not, so these
  need real `!important` in the module. Dropping them silently
  mis-positions the arrow on the left/right/inline sides only, which a
  top-side-only spot check won't catch.
- Positioner's `isolate z-50` → its own `.tooltip-positioner` block using
  `var(--z-popup)`.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Housekeeping done first**: deleted all seven orphaned
  `ui/{tooltip,dropdown-menu,dialog,alert-dialog,tabs,field,empty}/*.module.css.d.ts`
  leftovers per the Phase 3 preamble.
- **Block naming**: `TooltipProvider`/`Tooltip`/`TooltipTrigger` render no
  element of their own (straight passthroughs to the Base UI primitive), so
  only `TooltipContent` needed CSS. Its three independently-rendered/nested
  parts became `.tooltip-positioner` (its own block — sibling-ish to Popup
  in the render tree, not an element of it), `.tooltip-content` (the block,
  on `Popup`), and `.tooltip-content__arrow` (an element — `Arrow` is a
  literal JSX child of `Popup` in this file). Confirmed no fourth block was
  needed: `Portal` renders nothing of ours.
- **`composes:` needed a one-time stylelint config fix**: `property-no-unknown`
  (from `stylelint-config-standard`) doesn't know CSS Modules' `composes`
  property — this part is the first real consumer of `motion.module.css`'s
  `.popup` class. Added `'property-no-unknown': [true, { ignoreProperties:
  ['composes'] }]` to `stylelint.config.js`. Not anticipated in the plan
  text; every remaining Phase 3 part composes from the same file and inherits
  this fix for free.
- **No animation properties declared in this module**, confirmed against the
  plan's checklist — `tooltip.module.css` is appearance-only, `composes:
  popup` supplies every keyframe, duration, `data-side` slide, and the
  reduced-motion override.
- **The kbd-chip contextual styling (color/background) needed no new CSS
  here** — `kbd.module.css`'s existing `:global([data-slot='tooltip-content'])
  &` selector (from Phase 2) already handles it. This part only added the
  three non-color overrides Tailwind's `**:data-[slot=kbd]:*` variants also
  set on a nested `Kbd`: `position: relative`, `isolation: isolate`,
  `z-index: var(--z-popup)`, `border-radius: var(--radius-large)`.
- **Arrow size/offsets kept as literals** (`0.625rem`, `2px`, `-0.625rem`,
  `1.5px`) rather than snapped to the space scale — per Conventions'
  "one-off geometry" carve-out, not the padding/gap snapping rule. These
  values are tightly coupled to the `rotate: 45deg` diamond math (each
  offset positions the rotated square's tip against the popup edge); snapping
  `size-2.5` (0.625rem) up to the nearest space tier (`--space-small`,
  0.75rem, a 20% jump) risked visibly misaligning the arrow tip without a
  matching recalculation of every dependent offset, for no token-reuse
  benefit on a value with no other call site.
- **`require-nesting` (strict) caught a real structural mistake**: the arrow
  was first drafted as a top-level `.tooltip-content__arrow { }` rule,
  sibling to `.tooltip-content { }` rather than nested inside it. The linter
  correctly rejected it (an element must nest inside its own block's rule in
  strict mode); fixed by moving the whole rule inside `.tooltip-content`.
  Confirms the rule catches this class of mistake mechanically, as intended.
- Translated `translate-x`/`translate-y` pairs to the standalone `translate`
  property per-side (not composed from separate x/y like Tailwind's CSS-var
  approach) — each `data-side` rule sets the full `translate: x y` value,
  matching the codebase's existing standalone-property convention (see
  `motion.module.css`'s `popIn`/`popOut` using `scale`, not `transform:
  scale()`).

**Browser verification (you):**
- Hover the add-dashboard `+`, a kebab, and the import/export button — the
  tooltip appears, fades/zooms in, and fades out on leave
- Tooltip arrow points at the trigger on **every** side you can reach (the
  top-bar ones are `top`; check at least one that flips)
- The `?` hint / any tooltip containing a `kbd` chip still renders the chip
  correctly with its extra right padding
- With OS "Reduce motion" on: it still fades, it does not zoom or slide

⏸ **PAUSE — review before Part 3.2.**

---

### Part 3.2 — `dropdown-menu`

**Importers:** `OptionsMenu.tsx`, `EntityOptionsMenu.tsx`,
`ImportExportBar.tsx`.

Notes:

- Largest file in the phase (270 lines, 16 exported parts). Positioner
  sizing comes off Base UI's `--anchor-width` / `--available-height` /
  `--transform-origin`; `origin-(--transform-origin)` →
  `transform-origin: var(--transform-origin)`.
- `DropdownMenuSubContent` gets its own `.popup` compose — the submenu
  animates independently of its parent menu.
- `data-closed:overflow-hidden` must survive; it's what stops the exit
  animation from showing a scrollbar mid-collapse.
- `DropdownMenuCheckboxItem` / `DropdownMenuRadioItem` /
  `DropdownMenuShortcut` / `DropdownMenuLabel` have no call site in this app
  — **port them faithfully and silently** (Decisions table).
- **Cascade-layer watch.** All three importers are still Tailwind-classed
  after this part and pass `className` into menu parts. Any property this
  module sets that one of them overrides via a Tailwind utility needs the
  `@layer base` treatment (see Handoff "Facts") — verify with
  `getComputedStyle`, not by reading the CSS.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Verified every non-trivial Tailwind→CSS translation against the
  installed `tailwindcss` (4.3.3)'s own compiled output**, not from memory —
  compiled the project's real `index.css` (with its `@theme` block, so
  `bg-destructive`-style custom color utilities actually resolve) against a
  scratch HTML file containing this part's literal class strings, via
  `npx @tailwindcss/cli`, and read the generated rules directly. This is
  what the plan's own "derive by reading Tailwind output" guidance calls
  for; worth doing again for Parts 3.3+, this file's largest by far.
- **Re-confirmed the opaque-token `oklch(from …)` rule is still correct**
  under 4.3.3, despite momentary doubt: the compiled output for
  `bg-primary/80`, `ring-foreground/5`, etc. is actually `color-mix(in
  oklab, var(--token) N%, transparent)` now, not the `oklch(from …)` text
  the Handoff "Facts" section describes — looked like a contradiction until
  a Playwright pixel-comparison (`ctx.fillStyle` + `getImageData` on a
  canvas, not just comparing the two serialized color strings) confirmed
  `color-mix(in oklab, X N%, transparent)` and `oklch(from X l c h / N%)`
  render **byte-identical pixels** for an opaque `X` — they're
  mathematically equivalent, and the codebase's chosen form is still exactly
  right. Used it here too: `.dropdown-menu-content`'s ring
  (`oklch(from var(--foreground) l c h / 10%)`, the dark `ring-foreground/10`
  value, not light `/5`) and `.dropdown-menu-item`'s destructive-focus
  background (`oklch(from var(--destructive) l c h / 20%)`, the dark value).
  `--border`'s `bg-border/50` (the separator) still needed `color-mix`
  specifically, per the existing embedded-alpha rule — confirmed still true
  too.
- **`ring-1 ring-foreground/N` + `shadow-lg` combine into one `box-shadow`,
  ring layer first**: Tailwind's own var-chain
  (`--tw-inset-shadow, --tw-inset-ring-shadow, --tw-ring-offset-shadow,
  --tw-ring-shadow, --tw-shadow`) puts the ring before the drop shadow, so
  `.dropdown-menu-content`'s `box-shadow` is `0 0 0 1px oklch(from
  var(--foreground) l c h / 10%), var(--shadow-large)` in that order, not
  the reverse.
- **`outline-hidden` is not `outline: none`** — confirmed via the same
  compiled-output check: it's `outline-style: none` unconditionally, plus
  an `@media (forced-colors: active) { outline: 2px solid transparent;
  outline-offset: 2px; }` block (a deliberate Windows-High-Contrast-mode
  affordance). All five interactive item types (`item`, `sub-trigger`,
  `checkbox-item`, `radio-item`) carry both declarations faithfully — this
  is a real, easy-to-miss behavioral difference from the `outline-none`
  Tailwind class already used elsewhere (`button`/`input`), not the same
  utility with a different name.
- **Two unplanned `stylelint.config.js` fixes, both structural and expected
  to recur for every remaining multi-block Phase 3+ file** (`dialog`,
  `alert-dialog`, `tabs`, `field`, `empty` all export several
  independently-styled parts the same way):
  1. `declaration-block-no-redundant-longhand-properties` flagged separate
     `overflow-x`/`overflow-y` — collapsed to the two-value shorthand
     `overflow: hidden auto` (no config change needed, just a fix).
  2. `no-descending-specificity` (part of `stylelint-config-recommended`,
     which `standard` extends — not something this project's config added)
     flagged both same-block cases (a low-specificity `svg { }` sizing rule
     after a higher-specificity `&[data-variant='destructive'] > svg { }`
     color rule) and, more importantly, **cross-block** cases (one block's
     `&:focus *` selector "descending" relative to a *different, unrelated*
     block's higher-specificity focus selector earlier in the same file).
     The rule assumes one shared, unscoped cascade; it has no notion that
     `.dropdown-menu-item` and `.dropdown-menu-sub-trigger` are different
     components that can never actually collide. Disabled project-wide
     (`'no-descending-specificity': null`) rather than fought file-by-file —
     BEM's whole point is that a modifier compound is *supposed* to
     out-rank its own block regardless of source position, and every
     remaining multi-part primitive will hit the cross-block version of
     this the moment it has two sibling blocks with same-named states
     (`:focus`, `:disabled`, …).
- **Block naming, following Part 3.1's "independently-rendered part → own
  block" pattern**: `DropdownMenuContent`'s two rendered pieces
  (`Positioner`, `Popup`) are `.dropdown-menu-positioner` /
  `.dropdown-menu-content`; every other independently-exported part
  (`Label`, `Item`, `SubTrigger`, `CheckboxItem`, `RadioGroup`→`RadioItem`,
  `Separator`, `Shortcut`) is its own top-level block. Only the pieces
  genuinely written inline inside another part's own function — the
  `CaretRightIcon` inside `SubTrigger`'s JSX, the indicator `<span>` inside
  `CheckboxItem`/`RadioItem`'s JSX — became elements
  (`.dropdown-menu-sub-trigger__caret`,
  `.dropdown-menu-checkbox-item__indicator`,
  `.dropdown-menu-radio-item__indicator`).
- **Deviation from this part's plan text**: rather than giving
  `.dropdown-menu-sub-content` its **own** `.popup` compose as drafted
  above, it stays a plain override block (`width: auto; min-width: 9rem;`)
  layered onto `.dropdown-menu-content` — `DropdownMenuSubContent` renders
  *through* the `DropdownMenuContent` component itself (`<DropdownMenuContent
  data-slot="dropdown-menu-sub-content" className={styles.dropdownMenuSubContent}
  .../>`), so every submenu instance already carries `.dropdown-menu-content`
  (and its `composes: popup`) as its own class, independently of the parent
  menu's instance — same independent-animation outcome the plan called for,
  reached through component composition already present in the `.tsx`
  rather than a duplicated CSS `composes:` line. `data-closed:overflow-hidden`
  lives once, on `.dropdown-menu-content`, and covers the sub-content for
  the same reason.
- **Cross-block reach for the focus→shortcut recolor**: `DropdownMenuItem`
  and `DropdownMenuShortcut` are two separate blocks in one file, and
  Tailwind's `group/dropdown-menu-item` + `group-focus/dropdown-menu-item:`
  pair (needed in Tailwind only to disambiguate nested groups) collapses to
  a plain native selector once both live in the same stylesheet — no
  "group" naming trick needed at all:
  `.dropdown-menu-item:not([data-variant='destructive']):focus *`. This is
  the Conventions section's "parent block reaching into a child block it
  composes" pattern, just within one file instead of across two.
- **No `@layer base` needed this part** — grepped all three importers
  (`OptionsMenu.tsx`, `EntityOptionsMenu.tsx`, `ImportExportBar.tsx`) and
  confirmed none passes a `className` into any `DropdownMenu*` component, so
  the "Cascade-layer watch" risk called out above doesn't apply here. Will
  need rechecking per-consumer in later parts.
- **`data-inset`, `data-variant`, `data-popup-open`, `data-disabled` all
  stay plain attribute selectors**, not CVA-driven BEM modifiers — matches
  the Handoff "Facts" note that `cva` is only used in 5 files
  (`button`/`badge`/`tabs`/`field`/`empty`), none of them this one;
  `DropdownMenuItem`'s `variant` prop drives a DOM attribute in the
  original source, not a `cva()` call, so porting it as an attribute
  selector is the faithful translation, not a missed BEM opportunity.

**Browser verification (you):**
- A link tile's kebab menu, a dashboard tab's kebab menu, and the
  import/export menu all open with the pop-in and close with the pop-out
- The "Move to…" **submenu** opens, animates on its own, and lists only
  *other* dashboards
- Menus flip/shift near the viewport edge without clipping (right-most
  dashboard tab, bottom-row tile)
- Keyboard: arrows move between items, Escape closes, focus returns to the
  trigger
- With OS "Reduce motion" on: fade only
- The destructive "Delete" item reads in the destructive color, including
  its icon if one is added later (no current call site passes one — this
  is a faithfulness check on the CSS rule, not a visual regression check)

⏸ **PAUSE — review before Part 3.3.**

---

### Part 3.3 — `dialog`

**Importers:** `EditDialog.tsx`, `ShortcutsDialog.tsx`.

Notes:

- **First `.dialog` tempo consumer, and this phase's likeliest visual
  break.** Verified in `motion.module.css`: `.dialog[data-open]` /
  `[data-closed]` supply **only** `animation-duration` /
  `animation-timing-function` — no `animation-name` — because the overlay
  (fade) and content (fade + zoom) need different keyframes. So
  `dialog.module.css` *must* supply `animation-name` itself:
  `fadeIn`/`fadeOut` on the overlay, `popIn`/`popOut` on the content.
- **Consequence, and this is a concrete trap, not a vague risk: the shared
  module's reduced-motion block cannot be relied on for `.dialog`.** That
  block sets `animation-name: fadeIn` on `.dialog[data-open]` —
  specificity (0,2,0). The consumer's own `.dialog-content[data-open] {
  animation-name: popIn }` is *also* (0,2,0), and a media query adds no
  specificity, so **source order alone decides**, and the consumer's
  stylesheet plausibly emits after the module it composes from. If it does,
  `popIn` wins even under reduced motion and the zoom ships to users who
  asked for no motion — silently, and invisible to typecheck/lint/tests.
  It's a one-sided failure (nothing breaks at normal motion either way), so
  don't try to determine the emission order — just make it moot:
  **`dialog.module.css` carries its own
  `@media (prefers-reduced-motion: reduce)` block** re-pointing its overlay
  and content at `fadeIn`/`fadeOut`. Same for Part 3.4. The `.popup`
  consumers (3.1, 3.2) don't have this problem — the shared module owns
  `animation-name` in both branches there, so there's nothing to tie with.
- Content is centered with `top/left: 50%` + `translate(-50%, -50%)`. The
  zoom **must** use the standalone `scale` property, never a `transform`
  shorthand, or it clobbers the centering translate and the dialog flies to
  the corner mid-animation.
- Overlay: `supports-backdrop-filter:backdrop-blur-sm` →
  `@supports (backdrop-filter: blur(1px)) { … }`.
- `DialogContent`'s close button is a `Button` with a Tailwind `absolute`
  — this is the exact case Phase 2's `@layer base` fix in `button.module.css`
  exists for. Re-verify `getComputedStyle(closeBtn).position === 'absolute'`
  after this part; the consumer side changing is what could disturb it.
- Headings: per Phase 1's reset deltas, `DialogTitle` keeps a UA font size
  unless the module sets one explicitly. Set it.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Found and fixed a real, silent animation bug this part's own plan text
  didn't anticipate**: writing a bare `animation-name: fadeIn;` /
  `popIn;` in `dialog.module.css`, expecting it to resolve to
  `motion.module.css`'s keyframes (as the plan's "must supply
  `animation-name` itself" note assumed), **does not work** — confirmed by
  reading the actual dev-server-served CSS, not by reasoning about it.
  Vite's CSS Modules pipeline locally scopes (hashes) *every*
  `animation-name` value against the *current file's own* hash namespace,
  regardless of whether a matching local `@keyframes` exists — so the
  reference compiled to a dangling name like `_fadeIn_8cxnz_1` with no
  `@keyframes` anywhere defining it. `composes:` doesn't help either; it
  only affects class-name concatenation, never property values. Confirmed
  the failure mode with Playwright: without the fix, the dialog would have
  opened/closed with a silent instant snap (no fade, no zoom) — no
  lint/tsc/test failure, nothing visibly "broken" except the missing
  motion. Tried (and confirmed working, then rejected in favor of the
  simpler option below) the CSS-Modules-native escape hatch — declaring the
  shared keyframes `@keyframes :global(fadeIn) { }` in `motion.module.css`
  and referencing them as `animation-name: global(fadeIn);` at each call
  site — but that would touch already-shipped, working `motion.module.css`
  and every one of its existing internal references (`.popup[data-open]`,
  the six `data-side` rules, the reduced-motion block), for a risk/reward
  that didn't clear the bar. **Fixed instead by duplicating the four
  `fadeIn`/`fadeOut`/`popIn`/`popOut` `@keyframes` blocks directly into
  `dialog.module.css`** (not `slideInFrom*` — nothing in dialog needs
  those) — same-file `animation-name` references are correctly scoped
  automatically, zero risk to `motion.module.css`, and consistent with
  Part 3.4's own already-decided "duplicate into `alert-dialog.module.css`
  rather than compose across sibling files" philosophy. **Part 3.4 needs
  the same duplication**, not a `composes:`/cross-file reference — this
  updates that part's guidance below.
- **Re-verified with Playwright, not just the compiled CSS text**: opened
  the app for real, pressed `?` mid-animation and read
  `getComputedStyle(overlay).animationName` (`_fadeIn_<hash>`, a real,
  defined keyframe now) and caught the overlay/content mid-fade/mid-zoom
  (`opacity: 0.176`, `scale: 0.959`), confirming the animation actually
  runs frame-by-frame rather than only checking the final settled state.
- **Close button position re-verified live, per this part's own callout**:
  `getComputedStyle` on the real close button in a real opened dialog
  reports `position: absolute; top: 16px; right: 16px; background:
  oklch(0.274 0.006 286.033)` — the `@layer base` mechanism from Phase 2
  still correctly lets this file's unlayered `.dialog-content__close` win
  over `button.module.css`'s layered `position: relative`, now that the
  close button's own className moved from a literal Tailwind `absolute`
  string to a CSS Module class.
  **Superseded (Part 3.4 review):** `button`'s `@layer base` escape hatch
  is gone — `.dialog-content__close` no longer sets `position` at all, and
  the close button instead passes `Button`'s new `positioned` prop. The
  `getComputedStyle` result above is unchanged (re-verified again in Part
  3.4), only the mechanism producing it changed.
- **`sm:max-w-md` / `sm:flex-row sm:justify-end` are real, and needed real
  media queries** (`@media (width >= 40rem) { … }`, Tailwind's default `sm`
  breakpoint, confirmed via compiled output) — **not** dropped. This
  corrects an over-broad earlier claim: Phase 2's "this app has no
  responsive breakpoints post-migration" note (Decisions/Facts, made to
  justify a `no-tailwind.mjs` regex fix) was only ever true of the seven
  Phase-2 files; `dialog.tsx`/`alert-dialog.tsx` do use `sm:`, and both
  behaviors are now ported as real `@media` rules. Verified with
  Playwright at both a wide (≥640px) and narrow (<640px) viewport: footer
  is `row`/`flex-end` above the breakpoint, `column-reverse`/`normal`
  below it; content `max-width` is `28rem` above, `calc(100% - 32px)`
  below.
- **`bg-black/30` (the overlay scrim) is a literal `rgb(0 0 0 / 30%)`**,
  not a design token — confirmed via compiled Tailwind output that this
  resolves through `--color-black` (`#000`), which has no equivalent in
  `tokens.css` and isn't part of this app's actual color system; black is
  achromatic, so `color-mix`/`oklch(from …)` and a plain `rgb()` alpha all
  render identically here (no hue/chroma to interpolate) — used the
  simplest literal form.
- **`outline-hidden`, `shadow-xl`→`--shadow-x-large`, `ring-foreground/N`→
  the dark (10%) `oklch(from …)` value, `rounded-4xl`→`--radius-4x-large`,
  `p-6`/`gap-6`→`--space-x-large`** all verified against real compiled
  Tailwind output the same way as Part 3.2, not from memory.
- **Added a project-wide `.sr-only` utility to `src/styles/global.css`**
  (verbatim Tailwind definition) rather than a per-component BEM element —
  it's a genuine cross-cutting accessibility pattern already anticipated by
  `field.tsx`'s still-Tailwind `[&>.sr-only]` selector (Part 3.6), not
  component-specific styling. First new addition to `global.css` since
  Phase 1.
- **Block naming**: `DialogOverlay`/`DialogContent` (Positioner has no
  direct dialog equivalent — Base UI's `Backdrop`/`Popup` are siblings
  under `Portal`, not wrapped) are their own top-level blocks, matching the
  plan's own named example. `DialogHeader`/`DialogFooter`/`DialogTitle`/
  `DialogDescription` are each their own block too (independently exported,
  not rendered inside another part's function body — same "Positioner vs.
  Arrow" test as Parts 3.1/3.2). Only the close button
  (`.dialog-content__close`) is a genuine element — it's written literally
  inside `DialogContent`'s own JSX.
- **`DialogDescription`'s child-`a` styling** (`*:[a]:underline` etc., a
  *direct-child* combinator in the original Tailwind) ported as `> a { }`,
  not a bare descendant `a { }` — matches original scope exactly.

**Browser verification (you):**
- Open and close the link edit dialog, the dashboard edit dialog, and the
  `?` shortcuts overlay
- **Exit animations actually play** — a broken `data-closed` selector makes
  a dialog vanish instantly rather than error, so "it closed" is not a pass
- The dialog stays perfectly centered *during* the zoom, not just after
- Backdrop blur is visible over the grid
- Close button sits pinned top-right, not inline in the header
- Escape closes; Tab is trapped inside
- With OS "Reduce motion" on: fades run, zoom does not, and the dialog is
  still centered and clickable
- Narrow the browser window below ~640px with a dialog open: the footer
  buttons stack (Cancel above Save) instead of sitting side by side, and
  the dialog's max-width relaxes to fill more of the narrow viewport

⏸ **PAUSE — review before Part 3.4.**

---

### Part 3.4 — `alert-dialog`

**Importers:** `ConfirmDialog.tsx`, `ImportExportBar.tsx` (its
`FeedbackDialog`).

Notes:

- Structurally a near-clone of Part 3.3 (overlay + centered content + the
  same animation split), plus `AlertDialogMedia`, `AlertDialogAction` and
  `AlertDialogCancel`. **Duplicate the rules into
  `alert-dialog.module.css` rather than `composes:`-ing them out of
  `dialog.module.css`** — cross-module composition between two sibling
  blocks buys a few saved lines and costs a cascade-order coupling between
  two files that are free to diverge. `composes:` stays reserved for
  `motion.module.css`.
  **This now includes the four `fadeIn`/`fadeOut`/`popIn`/`popOut`
  `@keyframes` blocks themselves, not just the rules that reference
  them** — Part 3.3 found (empirically, via the actual dev-server output,
  not by reading the CSS) that Vite's CSS Modules pipeline locally scopes
  every `animation-name` value against the *current file's own* hash
  namespace regardless of whether a matching local `@keyframes` exists, so
  a bare `animation-name: popIn;` in `alert-dialog.module.css` would
  silently resolve to a dangling name and the animation just wouldn't
  play — no error, no failed test. `dialog.module.css` already duplicates
  these four keyframes (see its Status note) for exactly this reason;
  `alert-dialog.module.css` needs its own copy too, not a reference to
  either file's.
- `AlertDialogAction` **does not auto-close** in Base UI (documented
  gotcha); both consumers close themselves in `onClick`. That's behavior —
  don't touch it while converting styling.
- `AlertDialogMedia` has no call site — port it faithfully and silently.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **A real, live cascade-layer case, the first one in Phase 3** (Parts
  3.1–3.3 all checked and found none). `ConfirmDialog.tsx` (not yet
  converted, Part 6.6) passes `className="text-foreground"` straight onto
  `AlertDialogDescription`, expecting it to override the component's own
  muted color for the delete-confirmation message. `text-foreground` is
  still a real, layered Tailwind utility; a plain unlayered
  `.alert-dialog-description { color: var(--muted-foreground) }` would
  otherwise win unconditionally (per the documented Cascade Layers fact)
  and the message would stay muted. **Originally fixed with `@layer base`**
  (moving just the `color` declaration into Tailwind's own layer name, the
  same technique as `button`'s `sizeIconXs`/`sizeIconSm`), verified working
  live with Playwright — then, on review, **replaced with a proper BEM
  modifier instead**, per direct instruction: `AlertDialogDescription` now
  takes an `emphasis` prop that adds `.alert-dialog-description--emphasis
  { color: var(--foreground) }`, and `ConfirmDialog.tsx` passes `emphasis`
  instead of a raw Tailwind className. This is the better fix — the intent
  ("this message wants full attention") is now declared explicitly by the
  consumer through the component's own API, instead of being an implicit
  side effect of which CSS layer happens to win a fight neither file's
  author necessarily notices. `button`'s `@layer base` escape hatch got the
  same treatment in the same pass — see "Facts established executing
  Phases 0–2"'s superseding note and the new `positioned` prop. Re-verified
  live with Playwright after the change: `getComputedStyle(description
  ).color` is still `oklch(0.987 0.002 197.1)`, matching `--foreground`
  exactly, and the dashboard-tab kebab / dialog close button (both
  consumers of `button`'s old escape hatch) still position correctly.
  (`className="sr-only"` on `AlertDialogTitle`, the same consumer's other
  override, needed no fix either way — `sr-only`'s properties don't overlap
  anything `alert-dialog-title` itself sets, so there's nothing to lose a
  cascade fight over.)
- **Duplicated the four `fadeIn`/`fadeOut`/`popIn`/`popOut` keyframes**
  into this file too, per Part 3.3's finding — verified live with
  Playwright (`getComputedStyle` on a real, opened delete-confirmation
  dialog mid-animation) that `animationName` resolves to this file's own
  hash and the animation genuinely runs, not just that the CSS text looks
  right.
- **The `size="sm"` → 2-column footer grid is real, live behavior** — both
  current call sites (`ConfirmDialog`, `ImportExportBar`'s
  `FeedbackDialog`) always pass `size="sm"`, so this is the one part of
  this component that isn't speculative faithfulness. Verified with
  Playwright: `display: grid; grid-template-columns: 132px 132px` on the
  real footer.
- **`size="default"`'s whole two-column media/title layout has zero current
  call site** (both consumers hardcode `size="sm"`) — ported faithfully and
  silently per the Decisions table, verified only by reading compiled
  Tailwind output (not live, since nothing in the app renders it today).
- **Verified every non-trivial utility against real compiled Tailwind
  output** (`grid-rows-[auto_1fr]`, the `has-data-[slot=…]`/
  `group-data-[size=…]/name:` chains, `text-balance`/`text-pretty`,
  `size-16`, `rounded-full`, `mb-2`, `max-w-xs`), same discipline as
  Parts 3.2/3.3. `md:` is a real, distinct breakpoint from `sm:`
  (`width >= 48rem` vs `40rem`) — `AlertDialogDescription`'s
  `md:text-pretty` needed its own media query, not reuse of the `sm:` one.
- **`mb-2` on `AlertDialogMedia`'s own root moved to its parent** —
  `.alert-dialog-header`'s `:has([data-slot='alert-dialog-media'])` block
  now sets `margin-block-end` on the media child from the outside, rather
  than `alert-dialog-media` setting its own bottom margin. Straightforward
  application of `docs/BEM.md`'s "no margin on a block's own root class":
  the spacing is about the media's position among its grid siblings, which
  is the parent's call, not the media block's own. This is a case Parts
  3.1–3.3 didn't have an instance of (none of tooltip/dropdown-menu/dialog
  had a same-file block using an independent sibling block's own margin
  utility this way).
- **Group/ancestor-context selectors resolved to plain local-class
  ancestor selectors, no `:global()` needed** — `.alert-dialog-content`
  and `.alert-dialog-header`/`-footer`/`-media`/`-title` are all local
  classes in the *same* file, so `.alert-dialog-content[data-size='sm'] &`
  works directly (same pattern as Part 3.2's
  `.dropdown-menu-item:focus .dropdown-menu-shortcut`). `:global()` stays
  reserved for the case Phase 2's `kbd` actually needs it: an ancestor
  class defined in a *different* file.
- **No importer passes a `className` onto `AlertDialogAction`/
  `AlertDialogCancel`** beyond `variant`/`onClick` props (both are plain
  `Button` passthroughs with zero component-owned styling, matching the
  original source), so neither needed a CSS block at all.

**Browser verification (you):**
- Delete confirmation for a link, and for a dashboard — open, cancel,
  reopen, confirm
- The destructive Delete button still reads as destructive next to Cancel
- The confirmation message reads in the full foreground color, not the
  dimmer muted-foreground tone
- Cancel/Delete sit side by side as two equal-width columns, not stacked
- Import a good file and a deliberately malformed one — the feedback dialog
  appears in both cases and its action button **closes it**
- Same animation checks as Part 3.3 (exit plays, centered during zoom,
  reduced-motion)

⏸ **PAUSE — review before Part 3.5.**

---

### Part 3.5 — `tabs`

**Importer:** `DashboardTabs.tsx`.

Notes:

- First non-animating part of the phase. `tabsListVariants` CVA
  (`default` / `line`) → `.tabs-list--default` / `.tabs-list--line`.
- The heavy lifting is Tailwind's `group/tabs` + `group/tabs-list`
  cross-part styling: `TabsTrigger` restyles itself based on the *root's*
  orientation and the *list's* variant. All three parts live in one module,
  so these become plain descendant selectors within the file
  (`.tabs--vertical .tabs-trigger { … }`) — the Conventions section's
  cross-component `className`-passing dance is **not** needed here, that's
  only for reaching into a different component's module.
- Drive the modifier classes off the **props** (`orientation`, `variant`),
  the way `separator` was done in Phase 2 — but **keep the
  `data-orientation` / `data-variant` attributes on the DOM**; they're
  written by our own code today and removing them is a behavior change, not
  a styling one.
- `dark:data-active:bg-input/30` → `color-mix(in oklab, var(--input) 30%,
  transparent)`. This is one of the two spots the Handoff section calls out
  by name — the `oklch(from …)` form is a real, visible bug here.
- `border-transparent!` carries a Tailwind important; keep it as
  `!important`.
- The `after:` pseudo-element underline is only visible in the `line`
  variant, which this app doesn't use — port it faithfully and silently.
- `h-[calc(100%-1px)]` and `after:bottom-[-5px]` are one-off geometry;
  literals are allowed (Conventions, "Token usage").
- **Do not touch `activateOnFocus`.** The roving-focus / ⌥←→ capture
  interaction is browser-verified only and is a documented gotcha.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` each render
  their own DOM node and aren't JSX-nested inside one another *within this
  file* (they're composed by the consumer), so per the Phase 3 preamble each
  became its own block — `.tabs`, `.tabs-list`, `.tabs-trigger`,
  `.tabs-content` — not a block/element chain.
- **`orientation` and `variant` are now real `cva()`s** (`tabsVariants`,
  `tabsListVariants`) driven by the component's own props, same pattern as
  Phase 2's `separator`, per the part's own instruction. `data-orientation`/
  `data-variant` stay on the DOM unchanged — still written by our code, nothing
  reads them for styling anymore.
- **The `group/tabs` + `group/tabs-list` cross-part styling became nested
  descendant selectors inside `.tabs`'s own modifier rules** (`.tabs-list`/
  `.tabs-trigger` reached from `&.tabs--horizontal`/`&.tabs--vertical`), per
  the part's own instruction — no `className`-passing needed since all three
  blocks live in one file already.
- **`data-active` stays a plain attribute selector** (`&[data-active]`), not
  a BEM modifier — it's written by Base UI itself, not our code, matching
  the "Base UI state selectors" convention and `dropdown-menu`'s existing
  `data-open`/`data-disabled`/etc. precedent. Same reasoning for
  `aria-disabled`, wrapped `:global()` per `button`/`badge`/`input`'s existing
  `aria-invalid`/`aria-expanded` precedent.
- **Two real bugs-that-aren't-bugs found by checking real computed styles
  against the compiled Tailwind, not just reading it** — both change what a
  literal utility-by-utility transcription would have produced:
  1. `border border-transparent!` is `border-color: transparent !important`
     unconditionally. Both `dark:data-active:border-input` and
     `focus-visible:border-ring` try to set `border-color` on top of it, but
     neither is `!important`, so neither can ever win — confirmed live with
     Playwright (`getComputedStyle` on an active tab and a keyboard-focused
     tab both read `borderColor: rgba(0, 0, 0, 0)`). Ported as: no
     `border-color` in `&[data-active]`, and a one-line comment in
     `&:focus-visible` explaining the omission rather than a dead
     declaration. The ring shadow and 1px outline are what actually carry the
     focus indication.
  2. `text-foreground/60 … dark:text-muted-foreground` — the dark-mode
     override *replaces* the translucent-foreground color with the opaque
     `--muted-foreground` token for the same `color` property (same
     specificity, later in source), it doesn't layer on top of it. Confirmed
     live: an inactive trigger computes `color: oklch(0.723 0.014 214.4)`,
     exactly `--muted-foreground`, not a 60%-alpha foreground. Ported as
     `color: var(--muted-foreground)` on the base rule, `var(--foreground)`
     on `:hover` and `&[data-active]` (both dark overrides already agreed
     with their light base value, so no cascade surprise there).
- **`rounded-full` → literal `9999px`**, matching the existing `badge`/
  `alert-dialog` precedent, not Tailwind's own `calc(infinity * 1px)` — confirmed
  visually and computationally identical (`getComputedStyle` before/after:
  `3.35544e+07px` → `9999px`, same rendered pill shape).
- **Verified every non-trivial utility against the real compiled Tailwind
  output** (`@tailwindcss/cli` against a scratch file with this component's
  literal class strings, same discipline as Parts 3.2–3.4): `h-9` → `var(--space-4x-large)`
  (`9 × 0.25rem = 2.25rem`, matching `button`'s own `size-9`), the
  `focus-visible:ring-[3px] ring-ring/50` → `box-shadow: 0 0 0 3px oklch(from
  var(--ring) l c h / 50%)` (opaque token, standard translation),
  `dark:data-active:bg-input/30` → `color-mix(in oklab, var(--input) 30%,
  transparent)` (the translucent-token rule, exactly the case the part's own
  notes called out by name), `py-1.5` snapped up to `--space-x-small` per the
  established rounding rule.
- **The `line` variant's underline (`after:` pseudo-element) and
  `size="default"`-equivalent vertical-orientation layout have zero current
  call site** (`DashboardTabs.tsx` only ever renders the default horizontal/
  default-variant combination) — ported faithfully and silently per the
  Decisions table, verified only against compiled Tailwind output, not live.
- **`DashboardTabs.tsx`'s own Tailwind classNames on `TabsList`/
  `TabsTrigger`** (`className="gap-1"`, `className="max-w-40 pr-6"`) were
  left untouched at first, on the assumption that plain source-order/
  specificity would keep `pr-6` winning like it did pre-conversion — **wrong,
  caught by the user in the browser, not by `yarn check`.** Same cascade-layers
  class of bug as Phase 2's `button` position fix and Part 3.4's
  `alert-dialog` color fix: `pr-6` is a real, still-layered Tailwind utility
  (this consumer doesn't convert until Part 5.2), and `tabsTrigger`'s own
  `padding-inline: var(--space-small)` is unlayered plain CSS, so the module
  rule always won regardless of order, silently keeping the kebab's reserved
  gutter at `0.75rem` instead of `pr-6`'s `1.5rem` — the options-menu kebab
  visibly overlapped the tab's text. Confirmed live with Playwright before
  and after the fix: `paddingRight` read `12px`, not `24px`, and a screenshot
  matched the bug report exactly. Fixed the same way as the two precedents —
  a real component prop instead of fighting the layer: `TabsTrigger` now
  takes a `hasOptionsMenu` boolean, mapping to `.tabs-trigger--has-options-menu
  { padding-inline-end: var(--space-x-large) }` (`pr-6`'s exact value, no
  snapping needed), and `DashboardTabs.tsx` passes `hasOptionsMenu` instead of
  the dead `pr-6` (its `max-w-40` className is untouched — that one has no
  competing module rule to lose to). Re-verified live: `paddingRight: 24px`,
  and a screenshot of the tab strip matches the intended "text, gap, kebab"
  layout. **Lesson, same as Phase 2's**: don't assume an unconverted
  consumer's override still wins just because nothing in *this* part's own
  module conflicts with it on paper — check every property the unconverted
  call sites override, not just the ones this part's own notes anticipated.

**Browser verification (you):**
- Tab strip renders correctly with 1, 3, and 11+ dashboards; long names
  truncate with an ellipsis
- Active tab is visually distinct from inactive; hover state on an inactive
  tab
- Clicking a tab switches dashboards; ⌥1–⌥9 / ⌥0 still work
- ⌥←/⌥→ still steps between dashboards **and wraps** (this is the
  roving-focus interaction — if it only moves focus without switching, the
  capture handler lost)
- Focus ring on a tab via keyboard Tab

⏸ **PAUSE — review before Part 3.6.**

---

### Part 3.6 — `field`

**Importers:** `LinkEditModal.tsx`, `DashboardEditModal.tsx`,
`EditDialog.tsx` (`FieldGroup`).

Notes:

- 236 lines, 11 exported parts, but shallow — mostly layout and typography.
  `fieldVariants` (orientation) → `.field--horizontal` /
  `.field--vertical` / `.field--responsive` as applicable.
- Imports `label` and `separator`, both already converted in Phase 2 —
  update those two import paths to the folder form while here.
- `has-data-checked:bg-input/30` → `color-mix(in oklab, var(--input) 30%,
  transparent)`. Second of the two spots the Handoff calls out by name.
- `FieldSeparator` has no call site (Phase 2 established `Separator` itself
  is unused in the app) — port it faithfully and silently.
- `FieldError` is the one part with real logic; it's the inline URL
  validation error surface. Styling only — don't touch its rendering.
- `tests/components/LinkEditModal.test.tsx` asserts on that error. It
  imports `LinkEditModal`, not `field`, so no test path changes here — but
  it is the automated signal that this part didn't break validation
  rendering, so read its failure carefully if it goes red.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: none of `FieldSet`/`FieldLegend`/`FieldGroup`/`Field`/
  `FieldContent`/`FieldLabel`/`FieldTitle`/`FieldDescription`/
  `FieldSeparator`/`FieldError` are JSX-nested inside one another within this
  file (each renders its own root, composed by consumers), so each became its
  own block (`.field-set`, `.field-legend`, …), per the Phase 3 preamble.
  `FieldSeparator`'s inner `<span>` and `FieldError`'s inner `<ul>` genuinely
  *are* JSX children of their own component's render, so those became real
  BEM elements (`.field-separator__content`, `.field-error__list`).
  `FieldSeparator`'s `<Separator>` child is a **different, foreign**
  component, so it got the cross-component pass-down pattern instead — a
  bare `.field-separator-line` class kept in `field.module.css`, passed as
  `className`, per the Conventions' `LinkTile`/`AspectRatio` example (not yet
  implemented anywhere else in the codebase; this is its first real use).
- **`FieldLegend`'s `variant` prop is a real controlled prop** (`legend` |
  `label`, defaulting `legend`), so it got a proper `cva()`-driven BEM
  modifier (`.field-legend--legend` / `.field-legend--label`), same pattern
  as `separator`/`tabs`'s `orientation` — not a bare `[data-variant]`
  attribute selector. `data-variant` itself stays on the DOM unchanged.
  `Field`'s `data-invalid`/`data-disabled` and `FieldGroup`'s `data-variant`/
  `data-slot` are **not** controlled props (only reachable via each
  component's `...props` spread, i.e. a raw consumer override) — those
  stayed plain attribute selectors, matching `Field`'s real call site
  (`<Field data-invalid={urlError ? true : undefined}>` in `LinkEditModal`).
- **New tokens**: `--leading-snug: 1.375` and `--leading-normal: 1.5` added
  to `tokens.css`. `field.tsx`'s `leading-snug`/`leading-normal` utilities
  are applied *standalone* (no paired font-size utility on the same
  element), so they don't correspond to any of the existing `--text-*-
  line-height` tokens (those are each tied to a specific paired font size).
  `--text-base`'s own line-height (`calc(1.5/1)` = `1.5`) happens to equal
  `--text-medium-line-height` exactly, so `FieldLegend`'s `text-base` reused
  that existing token rather than needing a third addition.
- **A CSS Modules trap caught before it shipped**: `.field--vertical`/
  `.field--responsive`'s `[&>.sr-only]:w-auto` was first written as a bare
  `& > .sr-only`, which CSS Modules scopes/hashes like any other local
  class — it would never have matched a real `sr-only` className from an
  unconverted consumer (`ConfirmDialog.tsx`'s `<AlertDialogTitle
  className="sr-only">`, still Tailwind's own global utility until Phase 6).
  Caught by reading the generated `.d.ts` (an unexpected `srOnly` key showed
  up) rather than by a live symptom. Fixed with `:global(.sr-only)`, same
  precedent as `label.module.css`'s existing `:global(.group[...])`/
  `:global(.peer)`. No current call site actually nests a `.sr-only` inside
  a `Field`, so this was a latent bug, not a visible one — worth calling out
  since `srOnly` in a generated `.d.ts` is exactly the kind of signal to
  check for on any future part with a bare non-BEM class selector.
- **Verified every non-trivial utility against the real compiled Tailwind
  output** (`@tailwindcss/cli`, same discipline as the rest of Phase 3),
  including the `@container/field-group` responsive-orientation branch
  (zero call site, ported faithfully) and the `has-[>[data-slot=field]]:`/
  `has-data-checked:`/`nth-last-2:` selectors on `FieldLabel`/
  `FieldDescription` (also zero call site).
- **Live-verified the real call sites** (`Field`/`FieldLabel`/`FieldError`/
  `FieldGroup`, as rendered by `LinkEditModal`/`DashboardEditModal`) with
  Playwright against the running dev server: field stacking/gap, the
  destructive-red invalid state on both the field's label text and its error
  message (`getComputedStyle` matched `--destructive`/`--text-small`/
  `--font-weight-normal` exactly), and label/field layout in both dialogs.
  **One dead end along the way, not a bug in this part**: triggering the
  validation error with an obviously-malformed string like `not a url` or
  the project's own `ht tp://broken` test fixture silently *succeeded* in a
  real Chromium tab — `new URL('https://not a url')` throws in Node/jsdom but
  Chromium's own URL parser is more lenient and percent-encodes the spaces
  into a valid (if nonsensical) hostname instead of throwing. This is a
  pre-existing gap between `lib/url.ts`'s test-suite behavior and real-browser
  behavior, unrelated to this part (`FieldError`'s rendering was explicitly
  not touched, per the part's own instruction) — not investigated further,
  out of scope here. Verified the error path instead with a string that
  fails identically in both environments (`isSafeHref('')`, i.e. an
  all-whitespace field, which trims to empty and always throws).

**Browser verification (you):**
- Link edit dialog: all three fields labeled, stacked, and aligned; Title /
  URL / Background image URL all save
- Dashboard edit dialog: name + background URL
- **Validation surface**: enter `not a url` → the inline error appears
  under the right field, is legible, and blocks save
- Enter `github.com` → saves as `https://github.com`
- Clear the background field → the background actually clears
- Keyboard Tab moves label→input→next field in order

⏸ **PAUSE — review before Part 3.7.**

---

### Part 3.7 — `empty`

**Importer:** `EmptyState.tsx`.

Notes:

- Smallest of the three CVA parts. `emptyMediaVariants` (`default` /
  `icon`).
- **Normalize the CVA call shape while converting.** `empty.tsx:52` is the
  odd one out across all five CVA files — it calls
  `cn(emptyMediaVariants({ variant, className }))` with `className` *inside*
  the CVA call, where `button`, `badge`, `tabs` and `field` all use
  `cn(variants({ … }), className)`. Change `empty` to match the other four.
  Behavior is identical once `tailwind-merge` is inert for module classes;
  this is purely so all five read the same way.
- `EmptyTitle` / `EmptyDescription` keep UA heading sizing unless set
  explicitly — see Phase 1's reset delta 3.
- `EmptyState.tsx` itself is **not** converted here (that's Part 4.3); it
  still passes Tailwind classes into `Empty`, so the cascade-layer watch
  applies.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/
  `EmptyDescription`/`EmptyContent` each render their own root and aren't
  JSX-nested inside one another in this file, so each became its own block
  (`.empty`, `.empty-header`, …), per the Phase 3 preamble.
  `EmptyMedia`'s `variant` is a real controlled prop, so it got a `cva()`
  modifier (`.empty-media--default`/`--icon`), same pattern as
  `separator`/`tabs`/`field`'s controlled variants.
- **New tokens**: `--space-6x-large: 3rem` (`p-12`, exceeding the scale's
  previous top tier, `5x-large`/`2.5rem` — extended the same way Phase 2
  extended it for `button`'s `h-9`/`h-10`) and `--leading-relaxed: 1.625`
  (`EmptyDescription`'s `text-sm/relaxed`, a standalone line-height not
  paired with `text-sm`'s own token, same situation as Part 3.6's
  `--leading-snug`/`--leading-normal`). `EmptyTitle`'s `tracking-tight`
  (`-0.025em`) stayed a literal — a single, non-recurring use, not a scale
  the app has established elsewhere.
- **The cascade-layer watch the part's own notes called out did fire, live,
  before shipping** — caught by checking `getComputedStyle` against the
  running dev server, not by reading the CSS. `EmptyState.tsx`'s
  `w-80 flex-none` (still real, layered Tailwind — that file converts in
  Part 4.3) tried to override `Empty`'s own faithfully-ported `w-full
  flex-1`, and the unlayered module rule won unconditionally as usual: the
  welcome card rendered at `852px` wide and `flex-grow: 1`, stretching to
  fill its wrapper instead of sitting as a compact centered card. Screenshot
  confirmed the visible symptom, not just the computed values. Fixed the
  same way as `tabs`/`alert-dialog`: a real, reusable prop instead of
  fighting the layer — `Empty` now takes a `fluid` boolean (default `true`,
  preserving the original always-stretch behavior faithfully), and
  `fluid={false}` maps to `.empty--fixed { width: auto; flex: none }`.
  Deliberately generic ("don't stretch to fill the parent"), not
  `w-80`'s specific `20rem` baked into the `ui/` primitive — `EmptyState.tsx`
  keeps owning that specific measurement via its own (still-Tailwind, for
  now) `w-80` className, which now applies cleanly since nothing unlayered
  competes for `width` once `fluid={false}` drops the module's own
  `width: 100%`. Dropped the now-redundant `flex-none` from `EmptyState.tsx`
  (the modifier already sets `flex: none`); `border`/`bg-card/90`/the
  `animate-in` classes needed no change, no unlayered module rule competes
  with any of those properties. Re-verified live: width `320.8px`
  (`w-80`), `flex-grow: 0`/`flex-shrink: 0`, and a screenshot matching the
  original compact-card design.
- **`no-tailwind.mjs` flagged my own doc comment**, not application code —
  the `fluid` prop's JSDoc used the words "flex" and "fixed" in prose,
  which the script's regexes match on any line of a migrated `.tsx` file,
  comments included. Reworded the comment rather than special-casing the
  script; a reminder that the check's false-positive surface extends to
  comments, not just class strings.
- Confirmed `EmptyTitle`/`EmptyDescription` keep UA heading/paragraph
  sizing unless set explicitly, per Phase 1's reset delta 3 — neither sets
  its own `font-size` beyond what's listed above, matching the original.

**Browser verification (you):**
- A dashboard with zero links shows the centered welcome card: title,
  one-line instruction, "Add link" button
- Its entrance animation still plays (`animate-in fade-in-0
  slide-in-from-bottom-1` today — this part keeps whatever `EmptyState`
  passes in; Part 4.3 owns converting it)
- The "Add link" button creates a link and opens its edit dialog

⏸ **PAUSE — Phase 3 complete; review before Phase 4.**

---

## Phase 4 — App components: the grid surface (3 parts)

**Scope:** `DashboardGrid`, `LinkTile`, `EmptyState` — one per part, in that
order. Each moves to `src/components/<Name>/<Name>.tsx` +
`<Name>.module.css`, following Phase 3's per-part rhythm (own `yarn check`,
own browser pass, own ⏸, own commit).

**Why container-down.** Unlike Phase 3, these three nest
(`DashboardGrid` renders both `LinkTile` and `EmptyState`), and the
correctness-critical CSS is in the *container*. Converting the grid first
isolates "did the CSS Grid definition survive" from "did the tile survive" —
if a drag regresses in Part 4.2, the grid is already known-good. Phase 5
and 6 use the same container-down principle.

**Load `docs/fixtures/animation-test-data.json` via Import before the first
browser pass of this phase** and keep it for every part after.

---

### Part 4.1 — `DashboardGrid`

CSS Grid + `closestCenter` collision detection are **load-bearing for
reorder correctness**, not styling: a `flex flex-wrap` container broke
`rectSortingStrategy` for cross-row moves (documented gotcha). Transcribe
the grid definition exactly; do not "simplify" it. The add-tile's dashed
border and press scale come along. `LinkTile`/`EmptyState` are still
Tailwind-classed after this part — cascade-layer watch applies.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: this file exports a single component (no multi-part
  primitive shape), so the root wrapper is the block (`.dashboard-grid`) and
  the three genuinely-JSX-nested children — the centering wrapper, the CSS
  Grid itself, and the add-tile button — are flat elements
  (`.dashboard-grid__viewport`, `.dashboard-grid__tiles`,
  `.dashboard-grid__add-tile`), all nested one level inside `.dashboard-grid`
  regardless of their actual DOM depth, per BEM.md's "flatten nested
  elements" guidance.
- **Grid definition transcribed exactly, unchanged**: `display: grid`,
  `grid-template-columns: repeat(auto-fill, 14rem)`, `justify-content:
  center`, `gap: var(--space-medium)`, `max-width: 89rem`. `14rem`/`89rem`
  stayed literal (Conventions' one-off-geometry carve-out — no scale tier
  reaches layout-level dimensions like these, and `14rem` doubles as the
  add-tile's own width so a real tile and the add-tile stay pixel-identical
  by construction, not by coincidence).
- **New tokens**: `--space-6x-large` already existed (Part 3.7); added
  `--text-x-large: 1.875rem` / `--text-x-large-line-height: 1.2` for the
  add-tile's `+` glyph (`text-3xl`, the first use of a text size beyond the
  scale's previous top tier, `--text-large`/`1.125rem`) — continuing the
  same "small…large + Nx-" naming rather than jumping straight to a bare
  literal.
- **`ease-out-strong` needed an explicit `transition-timing-function`**,
  unlike `button`/`badge`/`input`'s hover/press transitions, which all
  omitted one and fell back to the browser default. Checked the actual
  compiled Tailwind output rather than assuming: unlike those three, the
  add-tile's source classes explicitly opt into the project's own named
  easing token (`ease-out-strong` — a real `@theme`-registered utility
  class, confirmed by compiling it), so leaving it out would have been an
  under-transcription, not a harmless omission.
- **No cascade-layer conflict from this direction** — `DashboardGrid`
  doesn't pass any `className` into `LinkTile`/`EmptyState` (unlike
  `Tabs`/`Empty`'s own conversions), and `App.tsx` doesn't pass a
  `className` into `DashboardGrid` either, so there was no unconverted
  consumer able to lose a cascade fight here. The part's own "cascade-layer
  watch applies" note is about the *reverse* direction (whether `LinkTile`
  relies on anything `DashboardGrid` no longer provides) — checked and
  unaffected, since grid-item sizing comes entirely from the parent's
  `grid-template-columns`, which `LinkTile` never touched.
- **Live-verified with Playwright against the running dev server**, using
  `docs/fixtures/animation-test-data.json` imported via the same hidden
  file-input the UI uses (`setInputFiles`, no real file-picker needed):
  - Grid: `display: grid`, exact column/gap/max-width values, centered;
    reflowed correctly at `700px` (2 columns) and capped at `1424px`
    (`89rem`) at `2200px` viewport width.
  - Add-tile: `224px × 126px` (`16:9` at `14rem`), dashed `2px` border in
    `var(--border)`, `var(--muted-foreground)` text — matched a real tile's
    `getBoundingClientRect()` exactly.
  - **Drag-and-drop, three sequential reorders on the 12-tile fixture
    dashboard** (same-row, cross-row down to the last tile, cross-row back up
    to the first), tracking tiles by their title text through each step, not
    DOM index. All three landed in the expected position immediately, with
    no off-screen flight and no reversion — the exact failure modes the
    Known Gotchas history warns a single screenshot won't catch, checked
    here by reading the full tile-order array after every drag instead.
  - **Confirmed dragging never navigates** (`page.url()` unchanged after
    all three drags) **and that a genuine click still does** (a real,
    non-drag click on a tile navigated to its `https://example.com/...`
    href) — both sides of the drag-vs-click suppression gotcha, not just
    the one this part could have broken.
  - Deleted a link via its options menu; the view-transition reflow ran
    with no thrown `pageerror` and the tile count/DOM updated correctly
    (`12 → 11`, the deleted tile's title gone).

**Browser verification (you):**
- Grid reflow at several window widths; the max-width cap on wide screens
- The trailing dashed "+" add-tile matches a real tile's size; its press
  feedback still fires
- **Drag-and-drop reorder, many distances and directions, including
  multi-row.** Track tiles by their visible identity, not DOM index. Watch
  for a tile flying off-screen and sliding back, or landing correctly then
  reverting. A single screenshot is not enough — these were only ever
  caught frame-by-frame.
- **Dragging a tile must not navigate.** Drop one, confirm the page doesn't
  change.
- Delete a link — the view-transition reflow animation

⏸ **PAUSE — review before Part 4.2.**

---

### Part 4.2 — `LinkTile`

- The `group`/`group-hover:` translation from Conventions applies here
  (`.tile:hover .surface`), as does `has-[a:active]:scale-[0.98]` →
  `:has(a:active)` inside a `prefers-reduced-motion: no-preference` block.
- **Leave the inline `style` object alone.** `transform`, `transition`,
  `opacity` and `viewTransitionName` are dnd-kit's, and the combined
  `transition` string is a documented fix — an inline style always beats a
  class for the same property, so moving opacity into the module silently
  does nothing.
- The image cross-fade (`opacity-0`/`opacity-100` + `transition-opacity`)
  becomes two module classes toggled by `cn()`.
- `LinkTile` passes `className` down into the already-converted
  `AspectRatio` — that's the Conventions cross-component pattern, parent
  block reaching into a child block.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: single-component file, same shape as `DashboardGrid` —
  root wrapper is the block (`.tile`), and every genuinely-JSX-nested *native*
  child (the image, the link, the options wrapper) is a flat element
  (`.tile__image`, `.tile__link`, `.tile__options`).
  **Correction, applied before Part 4.3 started**: the class passed down to
  `AspectRatio` was first written as `.tile__surface` — wrong, caught by
  re-reading the Conventions section, whose cross-component-styling example
  names *this exact file* (`LinkTile`'s `AspectRatio`) and shows the passed
  class as bare `.surface`, top-level, not a `.tile__`-prefixed element —
  `AspectRatio` is a foreign block, not an element of `.tile`, matching
  `field`'s own `.field-separator-line` precedent for the same pattern.
  Renamed to `.surface`, moved to its own top-level rule (only the
  `.tile:hover .surface` cross-reach stays nested inside `.tile`, per
  "reaching into a different block … rooted at the reaching block's own
  `&`"); re-verified live with Playwright that the hover shadow-lift still
  reads identical `box-shadow` values before and after the rename.
- **The inline `style` object is untouched**, exactly per the part's own
  instruction — `transform`/`transition`/`opacity`/`viewTransitionName`
  still come from dnd-kit and the documented combined-transition fix,
  nothing moved into the module.
- **A real, live cross-file dependency found and deliberately preserved,
  not converted**: `OptionsMenu.tsx` (Part 6.1, not yet converted) drives
  the kebab's reveal-on-hover with a raw `group-hover:opacity-100`
  Tailwind class on the `Button` it renders — which only matches an
  ancestor carrying the *literal* Tailwind marker class `group`, not any
  scoped CSS-Modules class. Converting `.tile` to a pure BEM class here
  would have silently broken that (the kebab would never reveal, since
  `Button`'s own module sets no competing base opacity to lose a cascade
  fight over — the rule just wouldn't match its ancestor selector at all,
  no fallback). Kept `group` as a second, literal, unstyled className
  alongside `styles.tile` (`cn('group', styles.tile)`), with a one-line
  comment explaining why a seemingly-stray Tailwind-looking class survives
  the conversion. This is the reverse direction of every previous cascade-
  layer fix this phase — here *I* own the block, and a *different*
  unconverted file depends on a marker *I* must keep providing, not the
  other way round. Revisit when Part 6.1 converts `OptionsMenu.tsx`: it
  should get a real prop-driven reveal-on-hover class of its own (the same
  pattern as `tabs`'s `hasOptionsMenu`), at which point `group` can go.
- **`AspectRatio`'s own `group-hover:shadow-xl` is a *different* case,
  fully converted here** (not preserved as Tailwind) — since `LinkTile`
  passes a real scoped className into `AspectRatio` (already-converted,
  Phase 2) via the Conventions cross-component pattern, the hover-shadow
  relationship is entirely local to this one file now: `&:hover
  .surface { box-shadow: … var(--shadow-x-large) }`, no `group`
  dependency needed for this specific rule.
- **New color usage**: `ring-black/10` (light, discarded) /
  `dark:ring-white/10` (the winning dark value) has no existing token —
  `--color-white`/`#fff` isn't one of this project's semantic tokens, so
  used the literal `white` keyword in `color-mix(in oklab, white 10%,
  transparent)`, matching `badge`'s existing precedent (`color: white`) for
  a genuine one-off literal color with no semantic-token equivalent.
  `shadow-lg`/`shadow-xl` reused `--shadow-large`/`--shadow-x-large`
  directly — their compiled values are exact matches, confirmed against the
  real Tailwind output, not assumed from the names.
- **`no-tailwind.mjs` needed two real fixes**, both found by running it
  against this file's actual (unchanged) pre-existing code, not by
  anything I introduced stylistically:
  1. `useSortable`'s destructured `transition` return value (dnd-kit's own
     API, present in the file before this conversion and left untouched
     per the "leave the style object alone" instruction) tripped the bare
     `\btransition\b` alternative in the transition/duration/ease pattern.
     Every other alternative in that group already required a `-suffix`
     (`duration-\d+`, `ease-[\w-]+`); bare `transition` was the one
     inconsistent entry, clearly meant to catch Tailwind's *bare*
     `transition` utility class — which this app has never actually used
     anywhere (grepped the full not-yet-converted source to confirm).
     Changed it to `transition-[\w.,[\]-]+`, requiring the same suffix
     discipline as its neighbors.
  2. The inline `style` object's `var(--ease-out-strong)` (a real CSS
     custom-property reference, the *value* half of the documented
     combined-transition fix) tripped the `ease-[\w-]+` alternative, since
     `\b` matches at the hyphen inside `--ease-out-strong` same as it would
     at the start of a bare `ease-out-strong` Tailwind class. Grepped the
     whole `.tsx` tree for `var(--` and found this is the *only* inline
     CSS-variable reference in any `.tsx` file (everywhere else `var()`
     lives in `.module.css`, which this script never scans) — narrow
     enough to fix generally rather than special-case: added a `(?<!--)`
     negative-lookbehind guard to every prefix-word pattern in the script
     (space/text/shadow/etc., not just `ease`), so a future `var(--token)`
     inlined in a `.tsx` file's `style` prop won't collide with any
     same-named token again. Verified with small standalone regex tests
     that real Tailwind classes still match and only the `--`-prefixed
     custom-property form is excluded — not just skimmed by eye.
- **Live-verified with Playwright** against the fixture dashboard: kebab
  opacity `0 → 1` on hover (confirming the preserved `group` class actually
  works, not just compiles), `box-shadow` reading exactly
  `--shadow-large`'s values at rest and `--shadow-x-large`'s on hover (with
  the ring layer unchanged in both), the broken-image tile rendering zero
  `<img>` elements and falling back to `var(--muted)`, and **re-ran the
  full Part 4.1 drag checklist plus the drag-onto-tab move** — three
  sequential reorders (same-row, cross-row down, cross-row up) all landed
  correctly with no off-screen flight or reversion, a fourth drag onto the
  "Backgrounds" tab moved the tile there and appended it to the end of that
  dashboard's order, and no drag ever navigated while a genuine click still
  did.

**Browser verification (you):**
- Tile hover shadow lift; kebab fade-in on hover
- Title badge over the bottom-left; `Untitled` on an empty title
- 16:9 aspect ratio holds while resizing the window
- The fixture's broken-image URL falls back to flat color, no broken icon;
  a tile with no image likewise; the good images cross-fade in
- **Re-run the full Part 4.1 drag checklist** — the tile is the dragged
  element, so its conversion can reintroduce the positioning bugs
  independently of the grid's
- Drag a tile onto a dashboard tab (tab highlights, link moves)

⏸ **PAUSE — review before Part 4.3.**

---

### Part 4.3 — `EmptyState`

Has an `animate-in fade-in-0 slide-in-from-bottom-1` entrance — compose it
from `motion.module.css` if a matching keyframe exists there, otherwise give
it a local one rather than widening the shared module for a single consumer.
It renders `Empty`/`EmptyContent`/`EmptyTitle`… converted in Part 3.7, so
this is where the classes it passes down stop being Tailwind.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: `EmptyState` renders no native elements of its own
  besides the centering wrapper (`.empty-state`, the block) — `Empty` and
  `Button` are both foreign, already-converted components, so the classes
  passed into them (`.card`, `.action`) are bare, top-level, per the
  Conventions cross-component pattern (same correction just applied to
  `LinkTile`'s `.surface`, applied correctly here from the start).
- **No matching keyframe existed in `motion.module.css`** (its
  `slideInFromBottom` is tuned for popups at `var(--space-x-small)`/0.5rem;
  Tailwind's `slide-in-from-bottom-1` here is `1 × --spacing` = 0.25rem, a
  different distance) — gave it a local `enter`/`fadeIn` keyframe pair
  instead of widening the shared module for this one consumer, exactly per
  the part's own instruction. `fadeIn` is a fresh local copy (not a
  reference to the shared module's own `fadeIn`) for the same reason
  Part 3.3 established: Vite's CSS Modules scopes `animation-name` per file
  regardless of a same-named `@keyframes` existing elsewhere.
- **This part is where the app-wide reduced-motion mechanism actually
  changes**, not just this one component — until now, `EmptyState`'s
  entrance rode on a *global* Tailwind mechanism (`src/index.css`'s
  `@media (prefers-reduced-motion: reduce)` block zeroing tw-animate-css's
  `--tw-enter-*` vars for every `animate-in` usage app-wide, per
  `TECHNICAL_DESIGN.md`'s Known Gotchas). Converting this file's own
  classes away means it no longer benefits from that global hack, so it
  needed its own explicit `@media (prefers-reduced-motion: reduce) {
  animation-name: fadeIn }` override — the same per-module pattern already
  used throughout `motion.module.css`, now implemented locally for the
  first time outside that shared file. Verified live with Playwright's
  `reducedMotion: 'reduce'` context option: normal load resolves
  `animationName` to the scoped `enter` keyframe, reduced-motion resolves
  it to the scoped `fadeIn` keyframe, both confirmed by reading the actual
  hashed name, not assumed from the CSS text.
- **A real, previously-invisible gap found and fixed in two already-shipped
  files, not just this one**: neither `empty.module.css`'s `.empty`
  (Part 3.7) nor `field.module.css`'s `.field-label:has(> [data-slot=
  'field'])` (Part 3.6) ever set their own `border-color`. Both currently
  render correctly anyway — but only because Tailwind is still active and
  `src/index.css` carries a *universal* base-layer rule, `* { @apply
  border-border outline-ring/50; }`, silently supplying `border-color:
  var(--border)` to every element in the app that doesn't set its own.
  That rule disappears entirely at Phase 8. Caught here specifically
  because `EmptyState`'s card needed its exact current border color to
  write a faithful `.card` rule, and checking it live (`getComputedStyle`,
  not reading Tailwind's classes in isolation) showed `oklch(1 0 0 / 10%)`
  — exactly `--border`'s value — with no rule in either file accounting
  for it. Fixed both at the source (`border-color: var(--border)` added to
  each), rather than papering over it in `EmptyState`'s own module, since
  the gap belongs to the components that own the border, not this
  consumer. **This is a systemic risk, not a one-off**: any future part
  that adds a border without an explicit color and happens to currently
  render "correctly" may be silently relying on this same global default;
  grepped every already-converted module's `border`/`border-style`/
  `border-width` declarations for the same gap and found exactly these
  two — `button`/`badge`/`input`/`tabs`/`DashboardGrid` all already set an
  explicit color (even if `transparent`) on every border they declare, so
  no further gaps existed at this point in the migration. Worth re-checking
  again before Phase 8 removes the global rule for real.
- **`EmptyState`'s card needed only `border-width: 1px`** of its own —
  `border-style: dashed` and (now) `border-color: var(--border)` both
  already come from `Empty`'s own default, so the "faithful port" here
  wasn't "solid border" as the bare Tailwind `border` utility name might
  suggest read in isolation, it's dashed, confirmed unchanged before and
  after this conversion by comparing live `getComputedStyle` snapshots
  taken pre- and post-conversion.
- **Live-verified the whole card against a pre-conversion baseline
  snapshot**, not just checked in isolation: `borderStyle`/`borderWidth`/
  `borderColor`/`backgroundColor`/`width` all read identically before and
  after (`dashed`/`1px`/`oklch(1 0 0 / 10%)`/`color-mix(…, var(--card) 90%,
  …)`/`320.8px`), and a screenshot comparison confirmed no visible change.
  "Add link" still creates a link and opens its edit dialog.

**Browser verification (you):**
- An empty dashboard's welcome card: title, one-line instruction, "Add
  link" button — centered, correctly sized
- Its entrance animation plays on switching to that dashboard
- With OS "Reduce motion" on: it fades in without sliding
- "Add link" creates a link and opens its edit dialog

⏸ **PAUSE — Phase 4 complete; review before Phase 5.**

---

## Phase 5 — App components: the top bar (5 parts)

**Scope:** `Navbar`, `DashboardTabs`, `ImportExportBar`, `LogoIcon`,
`Wordmark` — one per part, in that order (container-down, per Phase 4).
Same per-part rhythm.

Parts 5.4 and 5.5 are minutes-long; run them back-to-back as two commits if
you'd rather not pause twice, but keep them as separate parts.

---

### Part 5.1 — `Navbar`

The top bar shell: full-width single row, logo → tab strip → flexible space
→ import/export button. Its children are all still Tailwind-classed after
this part — cascade-layer watch applies. Per BEM.md, the bar owns the
*layout* of its slotted children; resist porting any `m-*` from a child onto
that child's own root.

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: `.navbar` (the `<nav>` root) with one true element,
  `.navbar__brand` (the logo/wordmark wrapper — genuinely native, JSX-nested
  in this file). `DashboardTabs`/`ImportExportBar`/`LogoIcon`/`Wordmark` are
  all foreign, unconverted components rendered as-is; none needed a passed-
  down class from this file's own module.
- **`border-bottom-style`/`-width`/`-color` written as three longhands
  first, caught by `stylelint`'s `declaration-block-no-redundant-longhand-
  properties`** — collapsed to the `border-bottom` shorthand. Went back and
  did the same cleanup on `field`/`empty`'s own `border-style`/`-width`/
  `-color` trios from Parts 3.6/4.3 (the *non-directional* longhand form,
  which stylelint's rule apparently doesn't flag the same way, confirmed by
  running it directly against both — but collapsible all the same, so
  simplified for consistency with `DashboardGrid`'s existing `border: 2px
  dashed var(--border)` shorthand). `empty.module.css`'s `.empty` stays two
  longhands (`border-style`/`border-color`, no `border-width`) since it
  intentionally has no explicit width of its own — collapsing would require
  inventing one.
- **A new, recurring category of `no-tailwind.mjs` false positive**: this
  is the first part where a *converted* file forwards a literal Tailwind
  `className` to a child component that's still Tailwind (its own part is
  later in the plan) — `LogoIcon`/`Wordmark`/`ImportExportBar` all receive
  one here. That's real, intentional, temporary Tailwind on *their*
  eventual elements, not a leftover on `Navbar`'s own — but the script
  can't tell the difference from a bare line scan. Added a per-line escape
  hatch, a trailing `{/* tailwind-passthrough: … */}` JSX comment the
  script recognizes and skips, rather than trying to special-case the
  pattern generically (the script has no way to know which JSX tags are
  "still Tailwind" without effectively reimplementing `MIGRATED` per-tag).
  Marked all three forwarding lines, not just the two the current PATTERNS
  actually catch (`size-9`/`h-5`; `ml-auto` isn't caught today, since none
  of the existing patterns cover directional margin/padding utilities like
  `ml-`/`pr-` — a pre-existing gap, not introduced here) — future-proofs
  against that gap being closed later without silently re-flagging this
  line. This will recur through the rest of Phase 5 and 6 wherever a
  just-converted container still renders not-yet-converted children with
  explicit styling handed down.
- **Live-verified against the running dev server**: `display: flex`,
  `gap: 16px`, `border-bottom: 1px solid oklch(1 0 0 / 10%)` (`var(--border)`),
  padding matching `--space-medium`/`--space-x-small`, full viewport width.
  Confirmed the bar's own `background-image` stays `none` even while a
  dashboard with a real background image is active (switched to the
  fixture's "Backgrounds" dashboard and re-checked) — the layout owns no
  background of its own, exactly as the checklist requires.

**Browser verification (you):**
- Top bar spans full width, one row, correct height at several window sizes
- Logo left, tab strip beside it, import/export button hard right
- The bar stays a plain surface — a dashboard background image must never
  render behind it

⏸ **PAUSE — review before Part 5.2.**

---

### Part 5.2 — `DashboardTabs`

The riskiest part in the phase. The held-⌥ digit badges **must not shift the
tab strip's layout** (PRD requirement) — whatever absolute-positioning trick
does that today survives verbatim. Also holds the per-tab kebab hover reveal
(styled against `OptionsMenu`, not converted until Part 6.1) and the
drag-drop-target highlight. `Tabs`/`TabsList`/`TabsTrigger` are already
converted (Part 3.5).

**Status: done.** `yarn check` passes (81 tests, same count). Notes:
- **Block naming**: `DashboardTabItem`'s wrapper div is the only native
  element this file renders itself, so it's the sole block (`.dashboard-tab`,
  with the `isOver`-driven ring as a real modifier, `.dashboard-tab--over`,
  and the inner `<span>` as a true element, `.dashboard-tab__label` — a
  native child, not a foreign one). `TabsTrigger`/`Badge`/`TabsList`/`Button`
  are all already-converted foreign components — `.trigger`/
  `.shortcut-badge`/`.list`/`.add-button` are bare, top-level cross-component
  classes passed down to them, per the Conventions pattern (correctly from
  the start this time, following the `LinkTile` correction).
- **`group` preserved again, same reasoning as `LinkTile`**: this wrapper
  is the hover ancestor for its own kebab (`EntityOptionsMenu` →
  `OptionsMenu.tsx`, not converted until Part 6.1/6.2), which still keys
  its reveal-on-hover off the literal Tailwind `group` marker.
- **First real use of the `tailwind-passthrough` escape hatch added in
  Part 5.1** — `EntityOptionsMenu`'s `triggerClassName` prop, which
  `OptionsMenu.tsx` forwards straight onto an already-converted `Button`.
  Surfaced two more gaps in the mechanism itself while using it for real,
  both fixed in the script rather than worked around in this file:
  1. The marker comment didn't fit on the same line as the long
     `triggerClassName="…"` prop, so it went on the line above — which the
     script didn't check at all. Added a look-at-the-previous-line
     fallback.
  2. `<Badge … aria-hidden className={…}>` tripped `hidden` in the
     display-utility pattern — `aria-hidden` is a real ARIA attribute, not
     Tailwind's `hidden` class, but the word-boundary match doesn't know
     that. Added an `(?<!aria-)` guard, same shape as the earlier `(?<!--)`
     token-reference guard.
- **Live-verified every item on this part's own risk list**, not just the
  generic checklist, since this was flagged as the riskiest part in the
  phase: imported the fixture (4 dashboards) and confirmed with Playwright —
  tab strip `getBoundingClientRect()` is **pixel-identical** before and
  during a held Alt (`455.9×36` both times — the digit badges genuinely do
  not reflow the strip), 4 digit badges appear while held and drop to 0 on
  release *and* on a simulated blur-while-held (alt-tab-away), `Alt+2`/
  `Alt+→` switch to the right tab, and stepping `Alt+→` six times from
  index 2 in a 4-tab strip lands back on index 0 (wraps correctly). Kebab
  opacity reads `0` then `1` across a hover (the preserved `group` class
  actually works, not just compiles). The target tab's `box-shadow` reads
  exactly `0 0 0 2px var(--ring)` *while* a tile is being dragged over it,
  and the tile is actually present on that dashboard after drop. Delete's
  `aria-disabled` reads `null` with 4 dashboards and `true` on a fresh
  single-dashboard app load.

**Browser verification (you):**
- Tab strip layout with 1, 3, and 11+ dashboards; long names truncate with
  an ellipsis
- Hold ⌥ — digit badges appear on the first ten tabs, **the strip does not
  reflow**, badges vanish on release
- ⌥1–⌥9, ⌥0, ⌥←/⌥→, ⌥[/⌥] all switch correctly and wrap
- Alt-tab away and back while holding ⌥ — badges must not stay stuck on
- Per-tab kebab hover reveal; Delete disabled with one dashboard
- Drag a tile over a tab — highlight state, and the link actually moves

⏸ **PAUSE — review before Part 5.3.**

---

### Part 5.3 — `ImportExportBar`

Contains `FeedbackDialog`, which relies on `AlertDialogAction` *not*
auto-closing (Base UI difference) — leave its `onClick` close logic alone.

**Browser verification (you):**
- Import/export menu opens and is positioned under its button
- Export downloads `launch-tabs-export.json`
- Import shows the feedback dialog for both a good file and a deliberately
  malformed one, and its action button closes it

⏸ **PAUSE — review before Part 5.4.**

---

### Part 5.4 — `LogoIcon`

Inline SVG with a few classes; the smallest conversion in the plan. Watch
for `currentColor` inheritance — the reset does not set `color` on every
element the way preflight's cascade implied.

**Browser verification (you):** the logo renders at the right size and
color in the top bar; nothing shifted beside it.

⏸ **PAUSE — review before Part 5.5.**

---

### Part 5.5 — `Wordmark`

Same shape as 5.4. Uses the heading font — per Phase 1's reset delta 3, set
its size/weight explicitly rather than relying on a UA default.

**Browser verification (you):**
- Wordmark renders in Figtree at the right size/weight, baseline-aligned
  with the logo
- Both footer overlays still positioned and click-through: bottom-right
  copyright/extension link is click-through except on the link itself,
  bottom-left `?` hint is visible

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
are real CSS Modules and can actually be verified. The dialog shell then
precedes the two modals built on it.

Behavioral rule for the whole phase: the `useClosingDialog` contract (local
`open` state + deferring the parent callback to `onOpenChangeComplete`) is
what makes exit animations play at all. It is behavior, not styling —
don't touch it in any part.

---

### Part 6.1 — `OptionsMenu`

The shared three-dot/kebab trigger (tooltip'd dropdown-menu button, callers
pass items as children). Carries the `revealOnHover` behavior that
`LinkTile` (Part 4.2) and `DashboardTabs` (Part 5.2) style against — both
are converted modules now, so verify the reveal from *both* parents.

**Browser verification (you):** kebab hidden at rest and fading in on hover,
from a link tile **and** from a dashboard tab; its enlarged hit area still
works (click 4–6px outside the visible button); its tooltip still appears.

⏸ **PAUSE — review before Part 6.2.**

---

### Part 6.2 — `EntityOptionsMenu`

`OptionsMenu` + the Edit/Move/Delete item set shared by dashboards and
links.

**Browser verification (you):** both menus open with the right items;
"Move to…" submenu lists only *other* dashboards and moving works; Delete
is disabled/greyed when only one dashboard exists.

⏸ **PAUSE — review before Part 6.3.**

---

### Part 6.3 — `EditDialog`

The shared edit-modal shell (title, stacked fields, Cancel/Save footer) over
the Part 3.3 `dialog` primitive and the Part 3.6 `FieldGroup`.

**Browser verification (you):** open from a link and from a dashboard —
title, field stack and footer laid out correctly; Cancel / click-outside /
Escape all close **with the exit animation** and discard edits.

⏸ **PAUSE — review before Part 6.4.**

---

### Part 6.4 — `LinkEditModal`

Field set over `EditDialog`. **`tests/components/LinkEditModal.test.tsx`
updates its import to the new folder path** — the only test path this phase
touches, and the automated signal that URL validation still renders.

**Browser verification (you):**
- All three fields save (Title, URL, Background image URL)
- `not a url` → inline error, save blocked; `github.com` → saves as
  `https://github.com`; clearing the background field actually clears it

⏸ **PAUSE — review before Part 6.5.**

---

### Part 6.5 — `DashboardEditModal`

Name + background image URL over `EditDialog`.

**Browser verification (you):** rename persists to the tab strip; setting a
background URL changes the grid background; clearing it removes it; an
invalid URL is blocked with an inline error.

⏸ **PAUSE — review before Part 6.6.**

---

### Part 6.6 — `ConfirmDialog`

Shared delete confirmation over the Part 3.4 `alert-dialog`. Its
`useClosingDialog` variant is the one that needs to know *which* outcome
closed it — behavior, don't touch.

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
3. `main.tsx`: drop the `index.css` import; `global.css` only. Nothing
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
   a real override (`LinkTile` → `AspectRatio`, `EmptyState` → `Empty`),
   both classes now apply and stylesheet source order decides the winner.
   Check those call sites specifically.
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
- **`typed-css-modules` is not heavily maintained.** Verify in Phase 1 that
  it runs on this Node version and handles `composes: … from '…'` correctly.
  If it doesn't, the fallback is to drop to the loose `vite/client` typing
  and lean harder on the per-phase browser pass — but decide that in Phase 1,
  not later.
- **Drag-and-drop and the reorder-positioning bugs have no automated
  coverage.** `TECHNICAL_DESIGN.md` documents five separate fixes found only
  by frame-by-frame browser analysis. Phase 4's browser pass is the only
  thing standing between this migration and reintroducing them — treat the
  grid container's CSS as load-bearing logic, not styling.
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

## Handoff — resuming this plan in a fresh session

Everything below was established while drafting this plan. It is not
derivable from the repo alone; read it before starting a phase.

### Where to resume

**Phases 0, 1, and 2 are done and committed** (`git log`: `9a02e34` phase 0,
`e33447d` phase 1, then five commits for phase 2 — `1df5240` through
`0645caf`, the last three of which were corrections to phase 2 itself, not
new work; see "Facts established executing Phases 0–2" below for why there
were so many). **Parts 3.1 (`tooltip`), 3.2 (`dropdown-menu`), 3.3
(`dialog`), and 3.4 (`alert-dialog`) are done and committed** (see each
part's own Status note). Fixes from these parts apply to every remaining
Phase 3+ part: the `composes:`/`property-no-unknown` exception (3.1);
disabling `no-descending-specificity` (3.2 — it doesn't understand
BEM/CSS-Modules scoping and will false-positive on any file with more than
one block, which every remaining Phase 3 primitive has); never reference a
shared keyframe (`fadeIn`/`fadeOut`/`popIn`/`popOut`) by bare name across a
CSS Modules file boundary (3.3 — Vite locally scopes every `animation-name`
value against the *current file's own* hash regardless of whether a
matching local `@keyframes` exists, so a cross-file reference silently
resolves to nothing; `dialog.module.css` and `alert-dialog.module.css` each
duplicate the four keyframes themselves); and check every not-yet-converted
importer for a `className` passed onto a part whose module now sets that
same property — 3.4 was the first part with a real instance
(`ConfirmDialog.tsx`'s `text-foreground` on `AlertDialogDescription`).

**`@layer base` is no longer this project's answer to that last case.**
Phase 2's `button` and Part 3.4's `alert-dialog` both originally used
`@layer base` to let a not-yet-converted consumer's Tailwind utility win;
on review, both were replaced with an explicit BEM modifier driven by a
new component prop instead (`Button`'s `positioned` prop /
`.button--positioned`; `AlertDialogDescription`'s `emphasis` prop /
`.alert-dialog-description--emphasis`) — see "Facts established executing
Phases 0–2"'s superseding note and Part 3.4's Status note for the full
reasoning. **Any future case of this shape should reach for a prop-driven
modifier from the start, not `@layer base`.** The underlying Cascade
Layers diagnosis (unlayered CSS Module rules always beat layered Tailwind
utilities, regardless of specificity) is still correct background
knowledge; it's just no longer the fix.

**Resume at Part 3.5 (`tabs`)** — read that part, then this Handoff
section in full, then the Conventions section (materially different from
what Phase 3 was originally drafted against — see below) before writing
any CSS.

**A part, not a phase, is the unit of work** (Decisions table, "Phase
granularity"). One component per part: convert it, `yarn check`, write the
part's Status note into this plan file, hand the user its browser list, stop
at the ⏸. Each part lands as its own commit — *by the user*, not by you.
Phase 2 already worked this way in practice (6 commits); Phases 3–7 now say
so explicitly and list their parts in order.

### Working agreements for this repo and user

- **Never run `git commit` unless the user says "commit" in the moment.** Not
  at a wrap-up, not because a phase finished. List uncommitted work instead.
  (In practice this session the user committed each part themselves between
  turns — don't assume that means permission to commit proactively next time.)
- **The user verifies UI changes themselves** for the general manual
  click-through QA pass — each phase's "Browser verification (you)" list is
  written *for the user to execute*. Hand it over and stop at the pause.
  **Narrower carve-out, learned this session:** if the user reports a bug, a
  fix is applied, and they report the *same* bug persists, don't reason
  about it from first principles a second time — start a scratch dev server
  (check for port conflicts with the user's own running one first) and use
  Playwright (a devDependency now — see below) to check
  `getComputedStyle`/DOM state directly and confirm the fix numerically
  before reporting it fixed again. This is targeted debugging verification
  for a specific hypothesis, not the general visual QA pass, which still
  isn't yours to do proactively.
- **Use Playwright, not the `mcp__claude-in-chrome__*` tools, for scripted
  browser verification** (`getComputedStyle` checks, DOM queries) — the
  user asked for this explicitly, it's faster. `playwright` is a
  devDependency now; write a throwaway `.mjs` script *inside* the project
  directory (Yarn here uses the `node-modules` linker, so a script outside
  the repo, e.g. under a `/tmp` scratchpad, can't resolve `import {
  chromium } from 'playwright'`), run it with `node`, delete it when done.
  Kill any scratch dev server you started when finished (`lsof -ti:<port> |
  xargs kill`) — don't leave it running.
- **Pause at every ⏸.** Do not roll into the next phase without review.
- If the user asks for a deviation mid-execution, implement it directly and
  update this plan file's record (decision table, scope, notes) — don't ask
  first, and don't leave the plan describing what was originally decided.
  Phase 2 needed *four* separate correction rounds after its first "done"
  report this session (dead-code framing in comments, the space/text/
  radius/shadow scale naming, two real CSS bugs, then the full BEM/
  stylelint-bem rework) — each was a direct instruction to redo something,
  not a request for permission, and each was executed and re-verified
  before moving on rather than deferred.
- Don't report something "fixed" or "verified" from reasoning alone when a
  cheap empirical check is available — the CSS Cascade Layers bug (see
  below) was misdiagnosed as a specificity issue on the first pass, shipped
  without checking `getComputedStyle`, and the user caught it. The fix
  itself was correct once actually checked; the miss was skipping
  verification, not the CSS knowledge.
- The user prefers options over a single recommendation, and interview-style
  questions one at a time.
- Run typecheck, lint **and** tests — none catches the others' failures.

### Checked while re-planning Phase 3 into parts (don't re-derive)

Everything below was read out of the actual files, not inferred. The Phase 3
part notes already carry the consequences; this is the provenance.

- `src/styles/motion.module.css` **read in full.** `.popup` owns
  `animation-name` in both the normal and reduced-motion branches;
  `.dialog` owns it in *neither* at normal motion but *does* in the
  reduced-motion branch — that asymmetry is the trap written up in Part 3.3.
  Four `slideInFrom*` keyframes, six `data-side` rules, `delayed-open`
  present, slide distance `var(--space-x-small)` (matches Tailwind's
  `slide-in-from-*-2`).
- **Color tokens are unprefixed** (`--foreground`, `--popover`), not
  `--color-foreground`. Two earlier examples in this plan used the prefixed
  form for a token that doesn't exist; both fixed. `--z-popup: 50` exists.
- **The seven Phase 3 folders already exist containing only an orphaned
  generated `.d.ts`** with no `.module.css` beside it — gitignored, so
  invisible in `git status`. Delete before Part 3.1.
- **Importer map per component** is recorded inline in each part; it was
  grepped, not guessed. Note `App.tsx` imports `TooltipProvider` (Part 3.1
  touches `App.tsx` even though `App.tsx` isn't converted until Phase 7).
- **No intra-Phase-3 dependency remains** — `dialog`/`alert-dialog` need
  only `button`, `field` needs only `label` + `separator`, all three
  converted in Phase 2. That's what made a pure risk-ordering possible.
- `empty.tsx:52` is the *only* CVA call site passing `className` inside the
  call — see the corrected bullet below.

### Facts established executing Phases 0–2 (a later session — don't re-derive)

- **CSS Cascade Layers, not specificity, decides ties between a CSS Module
  rule and a not-yet-converted consumer's Tailwind utility class.**
  `@import "tailwindcss"` wraps every utility in `@layer theme, base,
  components, utilities;`; unlayered CSS (a plain CSS Module rule) always
  beats *any* layered CSS regardless of specificity — that tier of the
  cascade is checked before specificity. This broke `button`'s
  `sizeIconXs`/`sizeIconSm` (`position: relative`, needed for the
  `::before` hit-area trick) against consumers passing a Tailwind
  `absolute` class (`dialog.tsx`'s close button, the dashboard-tab and
  link-tile kebab triggers). Fix: put the declaration in `@layer base`,
  reusing Tailwind's own `base` layer name (registered lower-precedence
  than `utilities` by its layer-order statement in `index.css`) — see
  `button.module.css`. **This will recur** for any other converted
  module's property that a not-yet-converted consumer overrides via a
  Tailwind utility; check for it specifically in Phases 3–7, and verify
  with `getComputedStyle`, not just by reading the CSS.
- **`--border` and `--input` are the only two tokens with their own
  embedded alpha** (`oklch(100% 0 0deg / 10%)` and `/ 15%`). A Tailwind
  `<token>/<N>` opacity modifier on an *opaque* token
  (`--primary`/`--destructive`/etc.) compiles to a straight alpha
  substitution — `oklch(from var(--token) l c h / N%)` is the correct,
  verified-byte-identical translation. On `--border`/`--input` specifically,
  Tailwind instead compiles to `color-mix(in oklab, var(--token) N%,
  transparent)`, which *multiplies* the existing alpha (15%×30% = 4.5%),
  not overrides it — using the substitution form there is a real, visible
  bug (input fields render as light gray, not barely-there). Two
  not-yet-converted spots will need this when they convert: `tabs.tsx`'s
  `dark:data-active:bg-input/30`, `field.tsx`'s
  `has-data-checked:bg-input/30`.
- **CSS Modules are written as real kebab-case BEM**, enforced by
  `@jeremywalton/stylelint-bem` (installed from the npm registry —
  `@jeremywalton/stylelint-bem`, *not* the GitHub URL, which needs a
  `dist/` build step it doesn't have for git-based installs). This
  **supersedes** an earlier, wrong attempt at flattening BEM into bare
  camelCase modifier classes (`.default`, `.sizeXs`) with no real
  separator — indistinguishable from an orphaned modifier, and invisible
  to the linter (`stylelint-bem` only recognizes classes using the
  configured `__`/`--` separators). `package.json`'s `css:types` script
  runs `tcm -c`/`--camelCase` and `vite.config.ts` sets
  `css.modules.localsConvention: 'camelCaseOnly'` — both must convert
  identically or the generated `.d.ts` and Vite's runtime keys silently
  disagree; `.button--size-icon-xs` → JS `buttonSizeIconXs` in both. See
  the Conventions section's "Class naming and structuring (BEM)" for the
  full rules and `docs/BEM.md` for the methodology (its own
  `PRODUCT.md`/`CHECKS.md` live only in the plugin's own repo, checked out
  locally at `~/Workspace/stylelint-bem` on this machine — not part of
  this repo).
- **Native CSS nesting compiles to identical runtime behavior as flat
  rules** — confirmed with Playwright (`getComputedStyle`) before/after
  nesting every Phase 2 module, including the trickier bits (the `@layer`
  position fix, a `color-mix` background, and a nested `@media
  (prefers-reduced-motion: no-preference)` block gating `:active` press
  feedback, verified with a real `page.mouse.down()`/`.up()`, not a
  `getComputedStyle(el, ':active')` call — that doesn't simulate the
  pseudo-class at all and always returns the rest-state value).
- **Don't editorialize preserved-but-currently-unexercised component
  styling as "dead code"** in comments or chat — port it faithfully,
  silently. Components are full-featured; not every feature needs a call
  site in this app today. Applies to `kbd`'s tooltip/input-group nesting,
  `label`'s peer/group-disabled styling, `badge`/`button`'s
  `:has([data-icon=…])` rules — none have a current call site, all are
  kept.
- **`separator`'s `[data-orientation]` attribute never actually applied**
  — the installed `@base-ui/react` version's `Separator` never renders
  that attribute (checked its source directly), and `Separator` itself
  was unused anywhere in the app (`FieldSeparator` in `field.tsx` is
  dead). Converted to a real `cva()` call driven by the `orientation`
  prop instead of the (inert) attribute selector — incidentally the one
  place this migration's CSS is *more* correct than the pre-migration
  Tailwind version, not just equivalent.

### Facts established drafting this plan (an earlier session — don't re-derive)

- **Scale:** 14 `ui/` primitives, 15 app components, `App.tsx`, ~2,540 lines
  of TSX total. `index.css` is 203 lines. Largest files: `dropdown-menu`
  (270), `field` (236), `alert-dialog` (185), `dialog` (157).
- **`<html class="dark">` is hardcoded in `index.html`** and there is no theme
  switcher, so the light palette and the non-`dark:` half of the 28 `dark:`
  overrides are dead code today. That's what makes the dark-only collapse
  safe.
- **`--sidebar-*` and `--chart-*` tokens have zero references** in any `.tsx`.
  Pruning them was offered and explicitly declined — keep them.
- **`cva` is used in exactly 5 files**: `button`, `badge`, `tabs`, `field`,
  `empty`. `cn()` is used in 20 files. **Corrected:** an earlier version of
  this bullet claimed three call sites pass `className` *inside* the CVA
  call (`field.tsx:80`, `tabs.tsx:48`, `empty.tsx:52`) while also calling
  `empty.tsx` the odd one out — self-contradictory, and wrong. Re-checked
  against the files: `field.tsx:80` and `tabs.tsx:48` both use the
  *alongside* form, `cn(variants({ … }), className)`. **`empty.tsx:52` is
  the only inside-the-call site**, `cn(emptyMediaVariants({ variant,
  className }))`, and Part 3.7 normalizes it to match the other four.
- **`buttonVariants`/`badgeVariants` are not imported anywhere outside their
  own files** — no external consumer to keep compatible.
- **There is no `src/vite-env.d.ts`**, but `tsconfig.app.json` sets
  `"types": ["vite/client"]`, which is what makes `*.module.css` imports
  type-check at all (loosely). That's why the typed-`.d.ts` decision matters.
- **`tsconfig.app.json` has `"include": ["src"]`** and is *not* `composite`,
  which is why Phase 0 adds `"tests"` to that include rather than creating a
  referenced `tsconfig.test.json` (`tsc -b` would need `composite: true`).
- **Test files import from `vitest` explicitly** (`import { describe, it }
  from 'vitest'`), so no `vitest/globals` types are needed after the move,
  despite `globals: true` in `vite.config.ts`.
- **`eslint.config.js` has an override on `src/components/ui/**/*.tsx`**
  disabling `react-refresh/only-export-components` — the glob still matches
  after the folder restructure, but verify.
- **`docs/plans/` is currently empty**; plans 001–007 shipped and 008 was
  rejected (commit `daf2dee`), so 009 is correct and numbers are never reused.
- **`docs/fixtures/animation-test-data.json`** is a ready-made import fixture
  covering multi-row reorder, tiles with/without images, a deliberately broken
  image URL, a dashboard background, and an empty dashboard. Use it for every
  browser pass from Phase 4 on.

### Behavior that must not be disturbed

All documented in `TECHNICAL_DESIGN.md`'s "Known Gotchas" — read that section
before Phases 3, 4 and 5. The ones this migration can plausibly break:

- `LinkTile`'s **inline `style` object** (dnd-kit's `transform`/`transition`,
  the combined opacity transition, `viewTransitionName`). An inline style
  always beats a class for the same property — moving opacity into the module
  silently does nothing.
- `DashboardGrid`'s **CSS Grid container + `closestCenter`**. A `flex
  flex-wrap` container broke `rectSortingStrategy` for cross-row moves; this
  is correctness code wearing styling clothes.
- `useClosingDialog`'s **local-`open` + `onOpenChangeComplete` contract** —
  it's why exit animations play at all. A broken `data-closed` selector makes
  dialogs vanish instantly rather than throw.
- `Tabs.List`'s `activateOnFocus: false` and the **capture-phase
  `stopPropagation`** in `useKeyboardShortcuts` that beats its roving focus.
- The **held-⌥ digit badges must not reflow the tab strip** (PRD requirement).
- `AlertDialogAction` **does not auto-close** in Base UI; consumers close
  themselves in `onClick`.
- `aspect-ratio.tsx`'s hand-applied `{...style, '--ratio': ratio}` merge.
- **Button's `sizeIconXs`/`sizeIconSm` set `position: relative` directly in
  their own nested rule** (the `@layer base` escape hatch this note
  originally described was removed in the Part 3.4 review — see that
  part's Status note). A consumer that needs the whole button absolutely
  positioned within its own layout (a dialog close button, a tab's kebab)
  passes `Button`'s `positioned` prop, which adds the
  `.button--positioned` modifier — a higher-specificity compound selector
  guarantees it wins over the size variant's own `position: relative`. Any
  new consumer needing this should reach for that prop, not a raw
  `position`/`absolute` override.
- **`tcm -c` and `vite.config.ts`'s `localsConvention: 'camelCaseOnly'`
  must change together, never one without the other** — they're what keep
  kebab-case BEM CSS and camelCase JS property access in sync (see Facts
  above). A change to one without the other is a silent, type-checked-away
  mismatch (the `.d.ts` would list a key Vite's runtime object doesn't
  actually have, or vice versa).

### Reference docs

`docs/PRD.md` (product behavior — the visual contract this migration must
preserve), `docs/TECHNICAL_DESIGN.md` (stack, gotchas, testing focus),
`docs/DATA_FORMATS.md` (untouched by this work), `docs/BEM.md` (the
Block/Element/Modifier structuring methodology this plan's "Class naming and
structuring" convention applies — its own linked `PRODUCT.md`/`CHECKS.md`
are in the `stylelint-bem` package repo, not this one), `AGENTS.md`
(commands, comment style, plan conventions).
