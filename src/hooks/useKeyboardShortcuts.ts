import { useEffect, useRef } from 'react'
import hotkeys, { type HotkeysEvent } from 'hotkeys-js'
import '../lib/keyboard'
import type { Dashboard } from '../types'

interface KeyboardShortcutsOptions {
  dashboards: Dashboard[]
  setActiveDashboardId: (id: string) => void
}

const DASHBOARD_KEYS = 'alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+7,alt+8,alt+9'

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    function handleDashboardKey(event: KeyboardEvent, handler: HotkeysEvent) {
      const position = Number(handler.shortcut.split('+')[1])
      const target = optionsRef.current.dashboards[position - 1]
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      optionsRef.current.setActiveDashboardId(target.id)
    }

    hotkeys(DASHBOARD_KEYS, { capture: true }, handleDashboardKey)
    return () => hotkeys.unbind(DASHBOARD_KEYS, handleDashboardKey)
  }, [])
}
