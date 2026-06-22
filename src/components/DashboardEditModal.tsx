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
import { Field, FieldGroup, FieldLabel } from './ui/field'
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

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dashboard-name">Name</FieldLabel>
            <Input id="dashboard-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel htmlFor="dashboard-background">Background image URL</FieldLabel>
            <Input
              id="dashboard-background"
              value={backgroundImageUrl}
              onChange={(e) => setBackgroundImageUrl(e.target.value)}
            />
          </Field>
        </FieldGroup>

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
