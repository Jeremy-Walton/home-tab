import hotkeys from 'hotkeys-js'

export const MAX_DASHBOARD_SHORTCUTS = 9

export function isMac(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent
  return platform.toLowerCase().includes('mac')
}

export function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"],[role="alertdialog"]') !== null
}

export function shortcutLabel(keyLabel: string): string {
  return isMac() ? `⌥${keyLabel}` : `Alt+${keyLabel}`
}

const defaultFilter = hotkeys.filter
hotkeys.filter = (event) => defaultFilter(event) && !event.repeat && !isDialogOpen()
