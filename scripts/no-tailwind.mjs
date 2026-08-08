import { glob, readFile } from 'node:fs/promises'
import path from 'node:path'

// Files considered fully converted to CSS Modules — grows one entry per
// migration phase (see docs/plans/009-tailwind-to-css-modules.md). Phase 8
// replaces this with ['src/**/*.tsx', 'index.html'].
const MIGRATED = [
  'src/components/ui/button/**/*.tsx',
  'src/components/ui/badge/**/*.tsx',
  'src/components/ui/kbd/**/*.tsx',
  'src/components/ui/label/**/*.tsx',
  'src/components/ui/input/**/*.tsx',
  'src/components/ui/separator/**/*.tsx',
  'src/components/ui/aspect-ratio/**/*.tsx',
  'src/components/ui/tooltip/**/*.tsx',
  'src/components/ui/dropdown-menu/**/*.tsx',
  'src/components/ui/dialog/**/*.tsx',
  'src/components/ui/alert-dialog/**/*.tsx',
  'src/components/ui/tabs/**/*.tsx',
  'src/components/ui/field/**/*.tsx',
  'src/components/ui/empty/**/*.tsx',
  'src/components/DashboardGrid/**/*.tsx',
  'src/components/LinkTile/**/*.tsx',
  'src/components/EmptyState/**/*.tsx',
  'src/components/Navbar/**/*.tsx',
  'src/components/DashboardTabs/**/*.tsx',
  'src/components/ImportExportBar/**/*.tsx',
  'src/components/LogoIcon/**/*.tsx',
  'src/components/Wordmark/**/*.tsx',
  'src/components/OptionsMenu/**/*.tsx',
  'src/components/EntityOptionsMenu/**/*.tsx',
]

const PATTERNS = [
  // `(?<!aria-)` on `hidden` guards against the real `aria-hidden` attribute
  // — the other words here don't collide with any aria-*/data-* attribute
  // name, so only `hidden` needs the guard.
  /\b(flex|grid|block|inline-flex|absolute|relative|fixed|sticky)\b|(?<!aria-)\bhidden\b/,
  // `(?<!--)` on the prefix-word patterns below guards against a design
  // token reference (`var(--space-x-large)`, `var(--ease-out-strong)`, …)
  // inlined in a .tsx file (rare — usually lives in .module.css, which this
  // script never scans — but the `style` prop is a real exception) being
  // misread as the same-named Tailwind utility class.
  /(?<!--)\b-?(p|m|w|h|gap|size|inset|top|right|bottom|left|space|min-w|max-w)-[\w./[\]-]+/,
  // `aspect-ratio` is excluded: it's the CSS property name (and this
  // project's own data-slot value), never a real Tailwind aspect-* utility
  // (those are aspect-auto/square/video/<number>/[value]).
  /(?<!--)\b(text|bg|border|ring|shadow|rounded|font|opacity|z|order)-[\w./[\]-]+|\baspect-(?!ratio\b)[\w./[\]-]+/,
  /\b(hover|focus|focus-visible|active|disabled|group-hover|motion-safe|dark|data-\[[^\]]+\]|data-open|data-closed|has|supports|\*\*):/,
  // `transition` requires a `-suffix` (like `duration-\d+`/`ease-[\w-]+`
  // below it) rather than matching bare — dnd-kit's `useSortable` return
  // value is itself named `transition`, so a bare match flags ordinary,
  // unrelated JS identifier usage in any file that touches drag-and-drop.
  /(?<!--)\b(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-\w+-\d|motion-dialog|motion-popup|transition-[\w.,[\]-]+|duration-\d+|ease-[\w-]+)\b/,
]

let hasHits = false

for (const pattern of MIGRATED) {
  for await (const entry of glob(pattern, { withFileTypes: true })) {
    if (entry.isDirectory()) continue
    const file = path.join(entry.parentPath, entry.name)
    if (file.endsWith('.d.ts')) continue
    const content = await readFile(file, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, index) => {
      if (/^\s*(import|export)\b.*\bfrom\b/.test(line)) return
      // A converted file can still forward a literal Tailwind className to a
      // child component that hasn't been converted yet (its own part is
      // still ahead) — that's real, intentional, temporary Tailwind, not a
      // leftover on *this* file's own elements. Marked with a
      // `{/* tailwind-passthrough: … */}` JSX comment, either trailing on
      // the same line or alone on the line directly above (a long prop line
      // often can't fit both), rather than widening a pattern, since it's
      // about where the class lands, not what it says.
      const marker = /\btailwind-passthrough\b/
      if (marker.test(line) || (index > 0 && marker.test(lines[index - 1]))) return
      if (PATTERNS.some((regex) => regex.test(line))) {
        console.error(`${file}:${index + 1}: ${line.trim()}`)
        hasHits = true
      }
    })
  }
}

if (hasHits) {
  process.exit(1)
}
