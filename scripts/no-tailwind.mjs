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
]

const PATTERNS = [
  /\b(flex|grid|block|hidden|inline-flex|absolute|relative|fixed|sticky)\b/,
  /\b-?(p|m|w|h|gap|size|inset|top|right|bottom|left|space|min-w|max-w)-[\w./[\]-]+/,
  // `aspect-ratio` is excluded: it's the CSS property name (and this
  // project's own data-slot value), never a real Tailwind aspect-* utility
  // (those are aspect-auto/square/video/<number>/[value]).
  /\b(text|bg|border|ring|shadow|rounded|font|opacity|z|order)-[\w./[\]-]+|\baspect-(?!ratio\b)[\w./[\]-]+/,
  /\b(hover|focus|focus-visible|active|disabled|group-hover|motion-safe|dark|data-\[[^\]]+\]|data-open|data-closed|has|supports|\*\*):/,
  /\b(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-\w+-\d|motion-dialog|motion-popup|transition|duration-\d+|ease-[\w-]+)\b/,
]

let hasHits = false

for (const pattern of MIGRATED) {
  for await (const entry of glob(pattern, { withFileTypes: true })) {
    if (entry.isDirectory()) continue
    const file = path.join(entry.parentPath, entry.name)
    if (file.endsWith('.d.ts')) continue
    const content = await readFile(file, 'utf8')
    content.split('\n').forEach((line, index) => {
      if (/^\s*(import|export)\b.*\bfrom\b/.test(line)) return
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
