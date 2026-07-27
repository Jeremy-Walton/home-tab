import { useEffect, useRef } from 'react'
import hotkeys, { type HotkeysEvent } from 'hotkeys-js'
import '../lib/keyboard'
import type { Dashboard } from '../types'

interface KeyboardShortcutsOptions {
  dashboards: Dashboard[]
  activeDashboardId: string | null
  setActiveDashboardId: (id: string) => void
  onAddLink?: () => void
  onShowHelp?: () => void
}

const DASHBOARD_KEYS = 'alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+7,alt+8,alt+9,alt+0'
const PREV_KEYS = 'alt+left,alt+['
const NEXT_KEYS = 'alt+right,alt+]'
const ADD_LINK_KEY = 'alt+n'
// '?' is Shift+/ on a US layout; hotkeys-js resolves '/' via its own keyCode
// map, so this is a normal binding. On layouts where '?' isn't Shift+/, this
// binding simply won't match -- the overlay is a convenience, not load-bearing.
const SHOW_HELP_KEY = 'shift+/'

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    function handleDashboardKey(event: KeyboardEvent, handler: HotkeysEvent) {
      const digit = Number(handler.shortcut.split('+')[1])
      const position = digit === 0 ? 10 : digit
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

    function handleAddLink(event: KeyboardEvent) {
      const { onAddLink } = optionsRef.current
      if (!onAddLink) return
      event.preventDefault()
      event.stopPropagation()
      onAddLink()
    }

    function handleShowHelp(event: KeyboardEvent) {
      const { onShowHelp } = optionsRef.current
      if (!onShowHelp) return
      event.preventDefault()
      event.stopPropagation()
      onShowHelp()
    }

    hotkeys(DASHBOARD_KEYS, { capture: true }, handleDashboardKey)
    hotkeys(PREV_KEYS, { capture: true }, handlePrev)
    hotkeys(NEXT_KEYS, { capture: true }, handleNext)
    hotkeys(ADD_LINK_KEY, { capture: true }, handleAddLink)
    hotkeys(SHOW_HELP_KEY, { capture: true }, handleShowHelp)
    return () => {
      hotkeys.unbind(DASHBOARD_KEYS, handleDashboardKey)
      hotkeys.unbind(PREV_KEYS, handlePrev)
      hotkeys.unbind(NEXT_KEYS, handleNext)
      hotkeys.unbind(ADD_LINK_KEY, handleAddLink)
      hotkeys.unbind(SHOW_HELP_KEY, handleShowHelp)
    }
  }, [])
}
