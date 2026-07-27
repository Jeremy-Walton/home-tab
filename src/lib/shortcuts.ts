import { shortcutLabel } from './keyboard'

export interface ShortcutDescription {
  keys: string[]
  description: string
}

export const SHORTCUTS: ShortcutDescription[] = [
  {
    keys: [`${shortcutLabel('1')}–${shortcutLabel('9')}`, shortcutLabel('0')],
    description: 'Switch to dashboard 1–10',
  },
  {
    keys: [shortcutLabel('←'), shortcutLabel('→'), shortcutLabel('['), shortcutLabel(']')],
    description: 'Previous / next dashboard (wraps)',
  },
  {
    keys: [shortcutLabel('N')],
    description: 'Add a link to the current dashboard',
  },
  {
    keys: ['?'],
    description: 'Show this help',
  },
]
