# Working with BEM

CSS is the language, BEM is the methodology

> BEM — is a methodology that helps you to create reusable components and code sharing in front‑end development

## Why

> [!NOTE] Good structure allows front end to be succinct, intention revealing, open to change, and easy to collaborate on.

> [!TIP] Following the conventions of BEM ensures consistent code and easier hand-off. Knowing when to break the conventions of BEM prevents us from being too rigid and over-specifying things.

## What is BEM

BEM stands for Block, Element, Modifier.

### Block

A functionally independent page component that can be reused. In HTML, blocks are represented by the class attribute.

`.block-name`

### Element

A composite part of a block that can't be used separately from it.

`.block-name__element-name`

### Modifier

Modifiers are flags on blocks or elements. They are used to change appearance, behavior, or state.

```css
.block-name--modifier-name
/* or */
.block-name--__element-name--modifier-name
```

## Structure

Keep in mind what components should be responsible for.

A component should be responsible for its own look and feel and the layout and position of its elements or slotted components.

A component should not be responsible for its own layout and position within the broader page. This is generally why avoiding use of margin is helpful. Margin means a component is affecting the thing that is laying it out, rather than trusting the parent element to position or space it correctly.

There are always exceptions to these rules but this helps set a general rule of thumb for thinking through things.

## Naming

Choose a block name that describes what the component *is*, not what it looks like or where it's used (`.tile`, not `.grid-item` or `.dashed-box`). Prefer a specific name over a generic one once a component has a distinct identity of its own, even if it started as a variant of something more general.

## Common mistakes

### Using Utilities instead of making an Element.

```html
<div class='block'>
  <div class='utility'>
    <div class='block__element'>...</div>
  </div>
</div>
```

Using Utilities between blocks and their elements can be valid in some cases as you compose for a specific implementation, but you must be careful you don't remove the responsibility of and ability to control the structure from the block. Consider making the utilities an element of the block.

### Utilities as Modifiers

```html
<div class='block'>
  <div class='block__element utility'>...</div>
</div>
```

Using utilities within a block is valid, allowing you to compose up different usage, but be careful not to use utilities to define state or intention that should always be. Using a named modifier brings intention to usage rather than relying on one-off solutions that may not be correctly replicated across usage.

### Misnaming nested Elements

```html
<div class='block'>
  <div class='block__element'>
    <div class='block__element__element2'>...</div>
  </div>
</div>
```

Rather than nesting the name of nested elements within elements, flattening the naming is preferred.

```html
<div class='block'>
  <div class='block__element'>
    <div class='block__element2'>...</div>
  </div>
</div>
```

### Elements as the new Block

```html
<div class='block'>
  <div class='block__element'>
    <div class='element__child'>...</div>
  </div>
</div>
```

Elements are not meant to be used as blocks as they do not represent the top-level concept. A new block can be used in tandem with an element to represent a new concept, or you can use them as additional elements.

### Orphaned Modifiers and Elements

```html
<div class='block--modifier'>...</div>
<div class='block__element'>...</div>
```

Modifiers should be used in combination with the intended block it is modifying. Elements should be used within the block they are a part of, not on their own.

Nesting your CSS helps enforce the intended structure and usage. Doing this trade usage enforcement for ease of customizing / modifying due to specificity.

In the following example, `.card__body` cannot be used outside of `.card`. Likewise for the modifier classes.

```css
.card {
  .card__header {
    &.card__header--compact {}
  }

  .card__body {}

  .card__footer {}

  &.card--padded {}
}
```

## Applying this to this project's CSS Modules

This project's CSS Modules convention (`docs/plans/009-tailwind-to-css-modules.md`)
writes real, literal kebab-case BEM in the `.css` source — actual `__`/`--`
separators, not a camelCase stand-in — one file per component, enforced
mechanically by `@jeremywalton/stylelint-bem`:

- **Block** → the module's root class, generally matching the component's
  own name (`LinkTile.module.css`'s `.tile`, `dialog.module.css`'s
  `.dialog`).
- **Element** → a child class nested inside its block via native CSS
  nesting, one level flat (`.tile__header`, never `.tile__header__title` —
  flatten to `.tile__title`). Only applies to *native* JSX children the
  block renders itself — a foreign component rendered as a child (a
  different component this file composes) is never an element; it's styled
  via the cross-component pattern instead (a bare, top-level class passed
  down as a `className` prop).
- **Modifier** → always compounded with its block or element, either as
  `&.block--modifier` nested inside the block's own rule, or
  `.block.block--modifier` written directly — never a bare `&.modifier {}`.
  A CVA variant's class value is a modifier by this same rule
  (`variant: { outline: styles.buttonOutline }` maps to `&.button--outline`
  in the CSS).
- **No orphaned elements/modifiers** — `stylelint-bem/no-orphaned-element`
  and `stylelint-bem/no-orphaned-modifier` enforce this mechanically.

Keeping JS ergonomic despite kebab-case CSS: `package.json`'s `css:types`
script runs `tcm` with `-c`/`--camelCase`, and `vite.config.ts` sets
`css.modules.localsConvention: 'camelCaseOnly'` — both convert
`.button--size-icon-xs` to the single JS property `buttonSizeIconXs`, so
`.tsx` files reference `styles.buttonSizeIconXs`, never bracket-notation
kebab-case. The two settings must change together — see
`docs/plans/009-tailwind-to-css-modules.md`'s "Conventions" section for the
full detail (native nesting, token usage, the cross-component styling
pattern, reduced motion).

The rest of this doc — block/element/modifier responsibilities, avoiding
margin for external layout, and the "Common mistakes" checklist — applies
unchanged.
