import { useRef, useState } from 'react'

// Base UI only plays a dialog's exit animation if the dialog owns its own open
// state, so the parent's callback has to be deferred to onOpenChangeComplete.
export function useClosingDialog<T = void>(onClosed: (outcome?: T) => void) {
  const [open, setOpen] = useState(true)
  const outcome = useRef<T | undefined>(undefined)

  function close(nextOutcome?: T) {
    outcome.current = nextOutcome
    setOpen(false)
  }

  return {
    close,
    dialogProps: {
      open,
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) setOpen(false)
      },
      onOpenChangeComplete: (nextOpen: boolean) => {
        if (!nextOpen) onClosed(outcome.current)
      },
    },
  }
}
