import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { FieldGroup } from './ui/field'

interface EditDialogProps {
  title: string
  onSave: () => Promise<void> | void
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ title, onSave, onClose, children }: EditDialogProps) {
  async function handleSave() {
    await onSave()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <FieldGroup>{children}</FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
