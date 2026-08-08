import { useClosingDialog } from '../hooks/useClosingDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd/kbd'
import { SHORTCUTS } from '../lib/shortcuts'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { dialogProps } = useClosingDialog(onClose)

  return (
    <Dialog {...dialogProps}>
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
