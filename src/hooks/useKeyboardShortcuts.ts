import { useEffect, useRef } from 'react'
import hotkeys, { type HotkeysEvent } from 'hotkeys-js'
import '../lib/keyboard'
import type { Dashboard } from '../types'

interface KeyboardShortcutsOptions {
  dashboards: Dashboard[]
  activeDashboardId: string | null
  setActiveDashboardId: (id: string) => void
}

const DASHBOARD_KEYS = 'alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+7,alt+8,alt+9'
const PREV_KEYS = 'alt+left,alt+['
const NEXT_KEYS = 'alt+right,alt+]'

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

    function cycle(event: KeyboardEvent, delta: number) {
      const { dashboards, activeDashboardId, setActiveDashboardId } = optionsRef.current
      if (dashboards.length < 2) return
      const currentIndex = dashboards.findIndex((d) => d.id === activeDashboardId)
      if (currentIndex === -1) return
      event.preventDefault()
      event.stopPropagation()
      const nextIndex = (currentIndex + delta + dashboards.length) % dashboards.length
      setActiveDashboardId(dashboards[nextIndex].id)
    }

    const handlePrev = (event: KeyboardEvent) => cycle(event, -1)
    const handleNext = (event: KeyboardEvent) => cycle(event, 1)

    hotkeys(DASHBOARD_KEYS, { capture: true }, handleDashboardKey)
    hotkeys(PREV_KEYS, { capture: true }, handlePrev)
    hotkeys(NEXT_KEYS, { capture: true }, handleNext)
    return () => {
      hotkeys.unbind(DASHBOARD_KEYS, handleDashboardKey)
      hotkeys.unbind(PREV_KEYS, handlePrev)
      hotkeys.unbind(NEXT_KEYS, handleNext)
    }
  }, [])
}
