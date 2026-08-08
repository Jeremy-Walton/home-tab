import { useClosingDialog } from '../../hooks/useClosingDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd/kbd'
import { SHORTCUTS } from '../../lib/shortcuts'
import styles from './ShortcutsDialog.module.css'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { dialogProps } = useClosingDialog(onClose)

  return (
    <Dialog {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>

        <ul className={styles.shortcutList}>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.description} className={styles.shortcutListItem}>
              <span className={styles.shortcutListDescription}>{shortcut.description}</span>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key} className={styles.kbdChip}>
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
