import { useState } from 'react'
import { useAppState } from '../context/useAppState'
import { EditDialog } from './EditDialog'
import { Input } from './ui/input'
import { Field, FieldLabel } from './ui/field'
import type { Link } from '../types'

export function LinkEditModal({ link, onClose }: { link: Link; onClose: () => void }) {
  const { updateLink } = useAppState()
  const [title, setTitle] = useState(link.title)
  const [url, setUrl] = useState(link.url)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(link.backgroundImageUrl ?? '')

  return (
    <EditDialog
      title="Edit link"
      onClose={onClose}
      onSave={() =>
        updateLink(link.id, { title, url, backgroundImageUrl: backgroundImageUrl || undefined })
      }
    >
      <Field>
        <FieldLabel htmlFor="link-title">Title</FieldLabel>
        <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field>
        <FieldLabel htmlFor="link-url">URL</FieldLabel>
        <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>

      <Field>
        <FieldLabel htmlFor="link-background">Background image URL</FieldLabel>
        <Input
          id="link-background"
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
        />
      </Field>
    </EditDialog>
  )
}
