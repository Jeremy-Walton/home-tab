import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from './ui/alert-dialog'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [open, setOpen] = useState(true)
  // Confirming deletes the entity that renders this dialog, so the outcome has
  // to wait until the closing animation has finished or it cuts itself short.
  const outcome = useRef<'confirm' | 'cancel'>('cancel')

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false)
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (nextOpen) return
        if (outcome.current === 'confirm') onConfirm()
        else onCancel()
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogTitle className="sr-only">Confirm delete</AlertDialogTitle>
        <AlertDialogDescription className="text-foreground">{message}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              outcome.current = 'confirm'
              setOpen(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
