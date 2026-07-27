import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Kbd, KbdGroup } from './ui/kbd'
import { SHORTCUTS } from '../lib/shortcuts'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
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
