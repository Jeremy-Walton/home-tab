import { useClosingDialog } from '../hooks/useClosingDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from './ui/alert-dialog/alert-dialog'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  // Confirming deletes the entity that renders this dialog, so the outcome has
  // to wait until the closing animation has finished or it cuts itself short.
  const { close, dialogProps } = useClosingDialog<'confirm'>((outcome) =>
    outcome === 'confirm' ? onConfirm() : onCancel(),
  )

  return (
    <AlertDialog {...dialogProps}>
      <AlertDialogContent size="sm">
        <AlertDialogTitle className="sr-only">Confirm delete</AlertDialogTitle>
        <AlertDialogDescription emphasis>{message}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => close('confirm')}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
