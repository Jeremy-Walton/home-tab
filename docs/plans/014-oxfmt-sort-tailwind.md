# 014 — Enable oxfmt `sortTailwindcss`

Turn on oxfmt's built-in Tailwind class sorting. Depends on `011` having
landed. Independent of `012` and `013`.

## What it is

`sortTailwindcss` uses the same algorithm as
[`prettier-plugin-tailwindcss`](https://github.com/tailwindlabs/prettier-plugin-tailwindcss),
built in rather than as a plugin. Option names drop the `tailwind` prefix
the original plugin uses.

Of the five options, two matter here:

| Option | Default | This repo |
|---|---|---|
| `stylesheet` | auto-detects the installed Tailwind's default | **Must be set to `src/index.css`.** This is a Tailwind **v4** project; the theme lives in `@theme` blocks in that file, and sort order depends on reading it. |
| `functions` | `[]` | **Must include `cn`.** |
| `attributes` | `[]` (beyond `class`/`className`) | Nothing extra needed. |
| `preserveDuplicates` | `false` | Leave — removing dupes is desirable. |
| `preserveWhitespace` | `false` | Leave. |

## Where the classes actually live in this repo

Three shapes, and the config only reaches two of them:

1. **Plain `className="…"` attributes** — covered by default. This is most
   of `src/components/*.tsx`.
2. **`cn(…)` calls** — 20 files use it, heaviest in `src/components/ui/`
   (`field.tsx` ×10, `alert-dialog.tsx` ×9, `dropdown-menu.tsx` ×9).
   Covered once `functions: ["cn"]` is set. `cn` is the only wrapper —
   `clsx`/`twMerge` are called exactly once each, inside `src/lib/utils.ts`,
   never directly by components, so they don't need listing.
3. **`cva(…)` variant maps** — `button.tsx`, `badge.tsx`, `tabs.tsx`,
   `field.tsx`, `empty.tsx`. These are class strings as *object values*, not
   function arguments. `functions` does exact-name matching on call
   expressions; whether that reaches strings nested inside a `cva` config
   object needs checking against real output (Phase 1 step 3) rather than
   assuming either way. If it doesn't reach them, that's an accepted
   partial win, not a blocker — those files are where the longest class
   strings live, so confirm before writing this off.

Note also that `sortTailwindcss` **does not know about the project's own
conventions**: `docs/TECHNICAL_DESIGN.md` documents `motion-dialog` /
`motion-popup` as custom `@utility` rules and `ease-out-strong` /
`ease-in-out-strong` as theme tokens. Reading `src/index.css` via
`stylesheet` is what lets the sorter place these correctly instead of
dumping them in the unknown-class bucket at the front — which is precisely
why that option is not optional here.

## Phases

### Phase 1 — configure and measure

1. Add to `.oxfmtrc.json`:

```json
{
  "sortTailwindcss": {
    "stylesheet": "src/index.css",
    "functions": ["cn"]
  }
}
```

   Paths resolve relative to the config file, so `src/index.css` is correct
   from the repo root.

2. `yarn oxfmt --list-different`.
3. Inspect real output on the four telling cases before committing:
   - `src/components/ui/tabs.tsx` — has the repo's single longest class
     string (~876 chars) and uses `cva`; the best test of whether `cva`
     values get sorted.
   - `src/components/ui/dialog.tsx` — carries `motion-dialog` and the
     `animate-in`/`fade-in-0` utilities; check custom utilities aren't
     shoved to the front as unknowns.
   - `src/components/LinkTile.tsx` — an app-level component with a plain
     `className` and a `cn` call.
   - `src/components/ui/button.tsx` — `cva` with several variants.
4. If custom utilities *are* being treated as unknown, the `stylesheet`
   path is wrong or isn't being read — fix that before proceeding rather
   than accepting the reordering.

### Phase 2 — apply

1. `yarn format`, land as a single mechanical commit.
2. Add the SHA to `.git-blame-ignore-revs`.

### Phase 3 — verify

1. `yarn lint`, `yarn tsc -b`, `yarn test`, `yarn build`.
2. **Load the app in a browser and look at it properly** — this is the one
   of the three oxfmt follow-ups with genuine visual risk (see Risks).
   Check: dialog and dropdown open/close animations, the link-tile hover
   controls, the dashboard tab strip, and a link tile both with and without
   a background image.
3. `docs/TECHNICAL_DESIGN.md` "Stack": note that Tailwind class order is
   formatter-enforced and that `src/index.css` is the sorter's stylesheet
   input — so moving or renaming that file breaks sorting, not just theming.
4. Delete this plan file in the commit that lands the work.

## Risks

- **This one can actually change rendering.** Tailwind class *order* in the
  source string is normally irrelevant (specificity comes from the
  generated stylesheet's layer order, not the attribute), but it is not
  irrelevant when two classes set the same property and the project is
  relying on `tailwind-merge` to resolve them — `cn()`'s whole job is
  last-wins conflict resolution, and sorting rewrites what "last" means.
  Any place a later class was deliberately overriding an earlier one inside
  a single `cn` argument is where a visual regression would appear. This is
  the reason for Phase 3 step 2.
- **`cva` coverage is unconfirmed** — see shape 3 above. Worst case the
  five `cva` files stay hand-sorted, which is the status quo.
