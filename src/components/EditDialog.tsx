import { useState } from 'react'
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
  onSave: () => Promise<boolean | void> | boolean | void
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ title, onSave, onClose, children }: EditDialogProps) {
  // The dialog owns its open state so Base UI can run the closing animation;
  // the parent only unmounts once that animation has finished.
  const [open, setOpen] = useState(true)

  async function handleSave() {
    const result = await onSave()
    if (result !== false) setOpen(false)
  }

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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <FieldGroup>{children}</FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
