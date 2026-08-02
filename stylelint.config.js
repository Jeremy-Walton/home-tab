export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // CSS Modules classes are camelCase (see docs/plans/009-tailwind-to-css-modules.md
    // Conventions) so tcm's generated .d.ts and Vite's runtime keys match.
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$',
    'keyframes-name-pattern': '^[a-z][a-zA-Z0-9]*$',
    // Relaxed to allow the existing token names, including the underscore
    // used for a fractional spacing step (e.g. --space-0_5).
    'custom-property-pattern': '^([a-z][a-z0-9_]*)(-[a-z0-9_]+)*$',
  },
}
