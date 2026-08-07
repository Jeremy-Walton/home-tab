export default {
  extends: ['stylelint-config-standard'],
  plugins: ['@jeremywalton/stylelint-bem'],
  rules: {
    // BEM class names are kebab-case block[__element][--modifier] (see
    // docs/BEM.md); tcm/Vite's camelCase conversion (see package.json's
    // css:types script and vite.config.ts) is what keeps JS property access
    // ergonomic despite the CSS source being kebab-case.
    'selector-class-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z][a-z0-9]*(-[a-z0-9]+)*)?(--[a-z][a-z0-9]*(-[a-z0-9]+)*)?$',
    'keyframes-name-pattern': '^[a-z][a-zA-Z0-9]*$',
    // CSS Modules' :global()/:local() scoping escapes aren't standard CSS.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    // CSS Modules' `composes:` (see src/styles/motion.module.css) isn't a
    // standard CSS property either.
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    // This rule assumes one shared, unscoped cascade and flags any
    // higher-specificity selector (e.g. a BEM modifier compound, which is
    // *supposed* to out-rank its own block) appearing before a lower one
    // later in the file — including across two totally unrelated blocks in
    // the same multi-part-primitive module (e.g. dropdown-menu.module.css),
    // which can never actually collide since each is scoped to its own
    // class. BEM's compounded modifiers (docs/BEM.md) make "descending
    // specificity" a deliberate, load-bearing pattern here, not a smell.
    'no-descending-specificity': null,
    'stylelint-bem/valid-name': true,
    'stylelint-bem/no-orphaned-element': true,
    'stylelint-bem/no-orphaned-modifier': true,
    'stylelint-bem/no-double-nested-element': true,
    'stylelint-bem/require-nesting': true,
  },
}
