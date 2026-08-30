import hotkeys from "hotkeys-js";

export const MAX_DASHBOARD_SHORTCUTS = 10;

// Positions 1-9 use their own digit; the 10th position uses 0 (⌥0),
// matching the alt+0 binding in useKeyboardShortcuts.ts.
export function dashboardShortcutDigit(index: number): number {
  return (index + 1) % 10;
}

export function isMac(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return platform.toLowerCase().includes("mac");
}

export function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"],[role="alertdialog"]') !== null;
}

export function shortcutLabel(keyLabel: string): string {
  return isMac() ? `⌥${keyLabel}` : `Alt+${keyLabel}`;
}

const defaultFilter = hotkeys.filter;
hotkeys.filter = (event) => defaultFilter(event) && !event.repeat && !isDialogOpen();
