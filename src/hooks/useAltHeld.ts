import { useEffect, useState } from 'react'
import hotkeys from 'hotkeys-js'
import '../lib/keyboard'

export function useAltHeld(): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    function handleKeyEvent(event: KeyboardEvent) {
      setHeld(event.altKey && !event.ctrlKey && !event.metaKey)
    }

    function reset() {
      setHeld(false)
    }

    hotkeys('*', { capture: true, keydown: true, keyup: true }, handleKeyEvent)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    window.addEventListener('contextmenu', reset)

    return () => {
      hotkeys.unbind('*', handleKeyEvent)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      window.removeEventListener('contextmenu', reset)
    }
  }, [])

  return held
}
