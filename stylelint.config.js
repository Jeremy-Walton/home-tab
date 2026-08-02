export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // CSS Modules classes are camelCase (see docs/plans/009-tailwind-to-css-modules.md
    // Conventions) so tcm's generated .d.ts and Vite's runtime keys match.
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$',
    'keyframes-name-pattern': '^[a-z][a-zA-Z0-9]*$',
    // CSS Modules' :global()/:local() scoping escapes aren't standard CSS.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
  },
}
