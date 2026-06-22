import { useState } from 'react'
import { useAppState } from '../context/useAppState'
import { EditDialog } from './EditDialog'
import { Input } from './ui/input'
import { Field, FieldLabel } from './ui/field'
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

  return (
    <EditDialog
      title="Edit dashboard"
      onClose={onClose}
      onSave={() => updateDashboard(dashboard.id, { name, backgroundImageUrl: backgroundImageUrl || undefined })}
    >
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
    </EditDialog>
  )
}
