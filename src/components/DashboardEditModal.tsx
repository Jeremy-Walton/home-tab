import { useState } from 'react'
import { useAppState } from '../context/useAppState'
import { EditDialog } from './EditDialog'
import { Input } from './ui/input'
import { Field, FieldLabel, FieldError } from './ui/field'
import { normalizeUrl, isSafeHref } from '../lib/url'
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
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(dashboard.backgroundImageUrl ?? '')
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  return (
    <EditDialog
      title="Edit dashboard"
      onClose={onClose}
      onSave={async () => {
        const nextBackgroundError =
          backgroundImageUrl.trim() === '' || isSafeHref(normalizeUrl(backgroundImageUrl))
            ? null
            : 'Enter a valid image URL, or leave this empty.'
        setBackgroundError(nextBackgroundError)
        if (nextBackgroundError) return false
        await updateDashboard(dashboard.id, {
          name,
          backgroundImageUrl: backgroundImageUrl || undefined,
        })
      }}
    >
      <Field>
        <FieldLabel htmlFor="dashboard-name">Name</FieldLabel>
        <Input id="dashboard-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field data-invalid={backgroundError ? true : undefined}>
        <FieldLabel htmlFor="dashboard-background">Background image URL</FieldLabel>
        <Input
          id="dashboard-background"
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
        />
        <FieldError>{backgroundError}</FieldError>
      </Field>
    </EditDialog>
  )
}
