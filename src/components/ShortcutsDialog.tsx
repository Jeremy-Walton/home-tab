import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Kbd, KbdGroup } from './ui/kbd'
import { SHORTCUTS } from '../lib/shortcuts'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false)
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.description} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{shortcut.description}</span>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key} className="whitespace-nowrap">
                    {key}
                  </Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
