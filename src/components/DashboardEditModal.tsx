import { useState } from 'react'
import { useAppState } from '../context/useAppState'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import type { Dashboard } from '../types'

export function DashboardEditModal({
  dashboard,
  onClose,
}: {
  dashboard: Dashboard
  onClose: () => void
}) {
  const { updateDashboard } = useAppState()
  const [name, setName] = useState(dashboard.name)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    dashboard.backgroundImageUrl ?? '',
  )

  async function handleSave() {
    await updateDashboard(dashboard.id, {
      name,
      backgroundImageUrl: backgroundImageUrl || undefined,
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit dashboard</DialogTitle>
        </DialogHeader>

        <label className="block text-xs text-muted-foreground">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </label>

        <label className="block text-xs text-muted-foreground">
          Background image URL
          <Input
            value={backgroundImageUrl}
            onChange={(e) => setBackgroundImageUrl(e.target.value)}
            className="mt-1"
          />
        </label>

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
