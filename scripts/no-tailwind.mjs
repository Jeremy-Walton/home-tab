import { glob, readFile } from 'node:fs/promises'

// Files considered fully converted to CSS Modules — grows one entry per
// migration phase (see docs/plans/009-tailwind-to-css-modules.md). Phase 8
// replaces this with ['src/**/*.tsx', 'index.html'].
const MIGRATED = []

const PATTERNS = [
  /\b(flex|grid|block|hidden|inline-flex|absolute|relative|fixed|sticky)\b/,
  /\b-?(p|m|w|h|gap|size|inset|top|right|bottom|left|space|min-w|max-w)-[\w./[\]-]+/,
  /\b(text|bg|border|ring|shadow|rounded|font|opacity|z|order|aspect)-[\w./[\]-]+/,
  /\b(hover|focus|focus-visible|active|disabled|group-hover|motion-safe|dark|sm|md|lg|data-\[[^\]]+\]|data-open|data-closed|has|supports|\*\*):/,
  /\b(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-\w+-\d|motion-dialog|motion-popup|transition|duration-\d+|ease-[\w-]+)\b/,
]

let hasHits = false

for (const pattern of MIGRATED) {
  for await (const file of glob(pattern)) {
    const content = await readFile(file, 'utf8')
    content.split('\n').forEach((line, index) => {
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
