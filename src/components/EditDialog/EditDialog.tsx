import { useClosingDialog } from '../../hooks/useClosingDialog'
import { Button } from '@/components/ui/button/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/dialog'
import { FieldGroup } from '@/components/ui/field/field'

interface EditDialogProps {
  title: string
  onSave: () => Promise<boolean | void> | boolean | void
  onClose: () => void
  children: React.ReactNode
}

export function EditDialog({ title, onSave, onClose, children }: EditDialogProps) {
  const { close, dialogProps } = useClosingDialog(onClose)

  async function handleSave() {
    const result = await onSave()
    if (result !== false) close()
  }

  return (
    <Dialog {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <FieldGroup>{children}</FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => close()}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
