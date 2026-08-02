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
| Phase granularity | Grouped by tier, 9 phases (0–8). |
| Class structuring methodology | **BEM (Block/Element/Modifier), per `docs/BEM.md`** — adapted to this project's camelCase/CSS-Modules convention rather than BEM's literal kebab-case `__`/`--` syntax (see that doc's "Applying this to this project's CSS Modules" section). Block = the module's root class (`.tile`); Element = a flattened child class scoped to that module (`.tileHeader`, not `.tile__tileHeader` — CSS Modules' file scoping already gives the collision-safety BEM's `__` prefix is for); Modifier = a composed sibling class or CVA variant, not a literal `--` suffix. Also pulls in BEM's non-naming rule: a component owns its own look/feel and its slotted elements' layout, not its own position within the page — avoid `margin` on a module's root class; trust the parent to position it. |

## Conventions

**Native CSS nesting.** Every module uses native CSS nesting (Chrome-only
app, no build-time downleveling needed) rather than flat repeated
selectors: a class's own pseudo-classes/pseudo-elements/`:has()`/`:global()`
states nest inside its own rule via `&`, and a class's own descendant
selectors (`svg { … }`, `::before { … }`) nest as bare selectors. Compiles
to the exact same flat CSS either way — confirmed with Playwright
(`getComputedStyle`) that behavior is byte-identical before/after nesting
`button`/`badge`/`kbd`/`label`/`separator`/`input` in Phase 2. Two
exceptions, both left un-nested for concrete reasons: (1) the `@layer base`
escape-hatch blocks in `button.module.css` (`sizeIconXs`/`sizeIconSm`'s
`position: relative`) stay as separate top-level blocks rather than nested
`@layer` blocks using `:where(&)` — the separate form is the one actually
verified working in a browser, and nesting an `@layer` inside a normal rule
is a less common pattern not worth the added risk for a cosmetic gain; (2)
peer/variant classes that don't share a selector relationship with each
other (e.g. `badge`'s `.default`/`.secondary`/`.destructive`/…) each keep
their own top-level rule — nesting is for a class's relationship to *itself*
in different states, not a way to group unrelated sibling classes together.

**Class naming and structuring (BEM).** Every module is structured per
`docs/BEM.md`'s Block/Element/Modifier methodology, written in `camelCase`
rather than BEM's literal kebab-case `__`/`--` syntax:

- **Block** — the module's root class, generally matching the component's
  own name (`LinkTile.module.css`'s `.tile`, `dialog.module.css`'s
  `.dialog`).
- **Element** — a child class scoped to that block, flattened rather than
  nested per-ancestor (`.tileHeader`, not `.tile__tileHeader` or
  `.header__title`) — CSS Modules' per-file scoping already gives the
  collision-safety BEM's `__` prefix exists for, so the separator is
  dropped, not renamed.
- **Modifier** — a composed sibling class (`cn(styles.tile, isActive &&
  styles.active)`) or a CVA variant key, per the module's own convention —
  never a literal `--` suffix.
- **No orphaned elements/modifiers.** An element class is only ever used
  inside its block's own JSX subtree; a modifier class is only ever
  combined with its base class, never applied alone.
- **No margin on a block's own root class.** Per BEM.md's "Structure"
  section, a component owns its own look/feel and the layout of its
  slotted elements, but not its position within the page — that's the
  parent's job (grid/flex gap, not margin). Watch for this specifically
  when transcribing Tailwind spacing utilities that used `m-*`/`mt-*`/etc.
  on a component's own root element; translate those to the parent's
  layout instead of porting a literal `margin` declaration.

Separately: leave Vite's `localsConvention` at its default (identity
mapping) so `tcm`'s generated `.d.ts` and Vite's runtime keys stay
identical — a `camelCaseOnly` conversion in one but not the other is a
silent class-name mismatch that nothing catches.

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

Added in Phase 1, run at the end of **every** phase:

```json
"css:types":   "tcm src -p \"**/*.module.css\"",
"stylelint":   "stylelint \"src/**/*.css\"",
"no-tailwind": "node scripts/no-tailwind.mjs",
"check":       "yarn css:types && yarn lint && yarn stylelint && yarn no-tailwind && tsc -b && yarn test"
```

`css:types` must run before `tsc -b` — the generated `.d.ts` files are what
make `styles.foo` type-check.

`scripts/no-tailwind.mjs` holds a `MIGRATED` array of globs that grows one
entry per phase. It scans those files for string literals containing tokens
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

## Phase 2 — Leaf `ui/` primitives (7)

**Scope:** the primitives with no dependency on other `ui/` files.

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
  `sm|md|lg` from the variant-colon pattern — this app has no responsive
  breakpoints post-migration (confirmed by grep), and bare `sm:`/`lg:` as a
  CVA size key (`sm: styles.sizeSm`) is otherwise indistinguishable from a
  Tailwind breakpoint variant. (4) `aspect-` now excludes the literal suffix
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
  utility class needs the same `@layer base` treatment, not a specificity
  trick.
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

## Phase 3 — Composite `ui/` primitives (7)

**Scope:** the primitives that import other primitives and/or animate.

`dialog`, `alert-dialog`, `dropdown-menu`, `tooltip`, `tabs`, `field`, `empty`

This is where `motion.module.css` gets exercised. Each popup's content and
backdrop `composes:` the matching tempo class:

```css
.content {
  composes: popup from '../../../styles/motion.module.css';
  background: var(--color-popover);
  /* … */
}
```

Per-component notes:

- **dialog / alert-dialog** — backdrop uses `motion.dialog` + the
  `supports-backdrop-filter:backdrop-blur-sm` translation
  (`@supports (backdrop-filter: blur(1px))`). Content is centered with
  `top/left 50%` + `translate(-50%, -50%)`; the zoom animation must compose
  with that translate — use the `scale` property (not a `transform`
  shorthand) in the keyframes so it doesn't clobber the centering translate.
  This is the most likely visual break in the phase.
- **dropdown-menu** — sizing off Base UI's `--anchor-width`,
  `--available-height`, `--transform-origin` vars; `origin-(--transform-origin)`
  becomes `transform-origin: var(--transform-origin)`. Submenu content
  (line 140) has its own popup animation. `data-closed:overflow-hidden`
  must survive.
- **tooltip** — has a third state, `data-state="delayed-open"`, plus the
  `**:data-[slot=kbd]:*` deep selectors → `.content [data-slot="kbd"] { … }`.
- **tabs** — `tabsListVariants` CVA. **Do not** touch `activateOnFocus`
  behavior; the roving-focus / ⌥←→ capture interaction is browser-verified
  only and is a documented gotcha.
- **field** — `fieldVariants` (orientation); imports label + separator, both
  already converted.
- **empty** — `emptyMediaVariants`; note this one calls
  `cn(emptyMediaVariants({ variant, className }))` (className *inside* the
  CVA call) rather than alongside it. Behavior is the same either way once
  `tailwind-merge` is gone, but keep the call shape consistent across all
  five CVA files while converting.

`scripts/no-tailwind.mjs`: add the seven new folders.

**Mechanical check:** `yarn check`.

**Browser verification (you):** animations are the whole point here —
- Open/close each of: link edit dialog, dashboard edit dialog, delete
  confirm, `?` shortcuts overlay, import/export menu, a tile kebab menu, a
  dashboard tab kebab menu, the "Move to…" submenu, a tooltip
- Confirm **exit** animations actually play (they only work because dialogs
  own their `open` state via `useClosingDialog` — a broken `data-closed`
  selector makes them vanish instantly rather than error)
- Tooltip on all four sides if reachable — the directional slide
- Dialog stays perfectly centered *during* the zoom, not just after
- Backdrop blur
- With OS "Reduce motion" on: fades still run, movement/zoom does not, and
  dialogs are still centered and clickable
- Keyboard: Escape closes, Tab is trapped inside a dialog

⏸ **PAUSE — review before Phase 4.**

---

## Phase 4 — App components: the grid surface

**Scope:** `LinkTile`, `DashboardGrid`, `EmptyState`

Each moves to `src/components/<Name>/<Name>.tsx` + `<Name>.module.css`.

Per-component notes:

- **LinkTile** — the `group`/`group-hover:` translation described in
  Conventions applies here (`.tile:hover .surface`), as does
  `has-[a:active]:scale-[0.98]` → `.surface:has(a:active)` inside a
  `prefers-reduced-motion: no-preference` block. **Leave the inline `style`
  object alone** — `transform`, `transition`, `opacity` and
  `viewTransitionName` there are dnd-kit's, and the combined
  `transition` string is a documented fix (an inline style always beats a
  class for the same property, so do not move opacity into the module).
  The image cross-fade (`opacity-0`/`opacity-100` + `transition-opacity`)
  becomes two module classes toggled by `cn()`.
- **DashboardGrid** — CSS Grid + `closestCenter` collision detection are
  load-bearing for reorder correctness (documented gotcha: a `flex flex-wrap`
  container broke `rectSortingStrategy` for cross-row moves). Transcribe the
  grid definition exactly; do not "simplify" it. The add-tile's dashed border
  and press scale come along.
- **EmptyState** — has an `animate-in fade-in-0 slide-in-from-bottom-1`
  entrance; give it a local keyframe or compose from `motion.module.css`.

`scripts/no-tailwind.mjs`: add the three new folders.

**Mechanical check:** `yarn check`.

**Browser verification (you):** load
`docs/fixtures/animation-test-data.json` via Import first, then —
- Grid reflow at several window widths; the max-width cap on wide screens
- Tile hover shadow lift; kebab fade-in on hover
- **Drag-and-drop reorder, many distances and directions, including
  multi-row.** Track tiles by their visible identity, not DOM index. Watch
  for: a tile flying off-screen and sliding back, or landing correctly then
  reverting. A single screenshot is not enough — these were only ever caught
  frame-by-frame.
- **Dragging a tile must not navigate.** Drop one and confirm the page
  doesn't change.
- Drag a tile onto a dashboard tab (tab highlights, link moves)
- Delete a link — the view-transition reflow animation
- The broken-image URL in the fixture falls back to flat color, no broken
  icon; a tile with no image likewise
- The empty dashboard's welcome card and its entrance animation

⏸ **PAUSE — review before Phase 5.**

---

## Phase 5 — App components: the top bar

**Scope:** `Navbar`, `DashboardTabs`, `ImportExportBar`, `LogoIcon`,
`Wordmark`

Per-component notes:

- **DashboardTabs** — the held-⌥ digit badges must not shift the tab strip's
  layout (PRD requirement); whatever absolute-positioning trick does that
  today needs to survive verbatim. Also holds the per-tab kebab hover reveal
  and the drop-target highlight.
- **ImportExportBar** — contains `FeedbackDialog`, which relies on
  `AlertDialogAction` *not* auto-closing (Base UI difference); leave its
  `onClick` close logic alone.
- **LogoIcon / Wordmark** — likely inline SVG with a few classes; smallest
  conversions in the plan.

`scripts/no-tailwind.mjs`: add the five new folders.

**Mechanical check:** `yarn check`.

**Browser verification (you):**
- Tab strip layout with 1, 3, and 11+ dashboards; long names truncate with
  an ellipsis
- Hold ⌥ — digit badges appear on the first ten tabs, **the strip does not
  reflow**, badges vanish on release
- ⌥1–⌥9, ⌥0, ⌥←/⌥→, ⌥[/⌥] all switch correctly and wrap
- Alt-tab away and back while holding ⌥ — badges must not stay stuck on
- Per-tab kebab hover reveal; Delete disabled with one dashboard
- Drag a tile over a tab — highlight state
- Import/export menu opens, export downloads, import shows its feedback
  dialog (both success and a deliberately malformed file)
- Both footer overlays: bottom-right copyright/extension link stays
  click-through except on the link itself; bottom-left `?` hint

⏸ **PAUSE — review before Phase 6.**

---

## Phase 6 — App components: dialogs and menus

**Scope:** `EditDialog`, `ConfirmDialog`, `ShortcutsDialog`, `OptionsMenu`,
`EntityOptionsMenu`, `LinkEditModal`, `DashboardEditModal`

These are compositions over the Phase 3 primitives, so most of them will be
thin modules — layout and spacing only.

Notes:

- The `useClosingDialog` contract (local `open` state + deferring the
  parent callback to `onOpenChangeComplete`) is behavioral, not styling.
  Don't touch it.
- `tests/components/LinkEditModal.test.tsx`'s import of the component
  updates to the new folder path.
- `OptionsMenu`/`EntityOptionsMenu` carry the `revealOnHover` behavior that
  Phase 4/5 parents style against — confirm the hover-reveal still works
  from both a tile and a tab after conversion.

`scripts/no-tailwind.mjs`: add the seven new folders.

**Mechanical check:** `yarn check`.

**Browser verification (you):**
- Edit a link (all three fields save), edit a dashboard (name +
  background URL)
- URL validation: enter `not a url` → inline error, save blocked; enter
  `github.com` → saves as `https://github.com`; clear the background field →
  background actually clears
- Cancel / click-outside / Escape all discard edits
- Delete confirm for both a link and a dashboard (cascade: its links go too)
- "Move to…" submenu lists only *other* dashboards
- `?` overlay lists every shortcut, with ⌥ labels (⌥ on macOS)
- Shortcuts are inert while a text field is focused or a dialog is open

⏸ **PAUSE — review before Phase 7.**

---

## Phase 7 — App shell and global CSS

**Scope:** `src/App.tsx`, `src/index.css`

1. Convert `App.tsx`'s layout shell to `src/App/App.tsx` +
   `App.module.css` (or keep `App.tsx` at `src/` root with an adjacent
   `App.module.css` — it isn't a component folder peer; **pick this** unless
   you'd rather it match). Includes the top-bar/content-area split, the
   dashboard background layer, and both footer overlays.
2. `src/index.css` → **`src/styles/tailwind-scratch.css`**, not deleted.
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

`scripts/no-tailwind.mjs`: add `src/App.tsx` (or the new path) and
`src/main.tsx`.

**Mechanical check:** `yarn check`. At this point `src/**/*.tsx` should be
fully migrated — grep manually for any stragglers before moving on.

**Browser verification (you):** a full sweep, since the global layer just
changed underneath everything —
- Top bar / content split at several window sizes
- A dashboard background image renders behind the grid only, never behind
  the top bar; a broken dashboard background falls back to flat color
- Both footer overlays still positioned and click-through
- Body font is Space Grotesk, headings Figtree
- Re-run a spot check of one dialog, one menu, one drag

⏸ **PAUSE — review before Phase 8.**

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

`git status` + `git log` against this plan file. Each phase lands as its own
commit; the plan file is updated in-place as phases complete (per
`~/.claude/CLAUDE.md`: update the plan file after each step before moving on).
If no phase has landed, start at Phase 0.

### Working agreements for this repo and user

- **Never run `git commit` unless the user says "commit" in the moment.** Not
  at a wrap-up, not because a phase finished. List uncommitted work instead.
- **The user verifies UI changes themselves.** Do not proactively start a dev
  server, drive Playwright, or take screenshots. Each phase's "Browser
  verification (you)" list is written *for the user to execute*. Hand it over
  and stop at the pause.
- **Pause at every ⏸.** Do not roll into the next phase without review.
- If the user asks for a deviation mid-execution, implement it directly and
  update this plan file's record (decision table, scope, notes) — don't ask
  first, and don't leave the plan describing what was originally decided.
- The user prefers options over a single recommendation, and interview-style
  questions one at a time.
- Run typecheck, lint **and** tests — none catches the others' failures.

### Facts established this session (don't re-derive)

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
  `empty`. `cn()` is used in 20 files. Three call sites pass `className`
  *inside* the CVA call rather than alongside it (`field.tsx:80`,
  `tabs.tsx:48`, `empty.tsx:52`) — `empty.tsx` is the odd one out.
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

### Reference docs

`docs/PRD.md` (product behavior — the visual contract this migration must
preserve), `docs/TECHNICAL_DESIGN.md` (stack, gotchas, testing focus),
`docs/DATA_FORMATS.md` (untouched by this work), `docs/BEM.md` (the
Block/Element/Modifier structuring methodology this plan's "Class naming and
structuring" convention applies), `AGENTS.md` (commands, comment style, plan
conventions).
