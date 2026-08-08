import { useState } from 'react'
import { useAppState } from '../context/useAppState'
import { EditDialog } from '@/components/EditDialog/EditDialog'
import { Input } from '@/components/ui/input/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field/field'
import { normalizeUrl, isSafeHref } from '../lib/url'
import type { Link } from '../types'

export function LinkEditModal({ link, onClose }: { link: Link; onClose: () => void }) {
  const { updateLink } = useAppState()
  const [title, setTitle] = useState(link.title)
  const [url, setUrl] = useState(link.url)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(link.backgroundImageUrl ?? '')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  return (
    <EditDialog
      title="Edit link"
      onClose={onClose}
      onSave={async () => {
        const normalizedUrl = normalizeUrl(url)
        const nextUrlError = isSafeHref(normalizedUrl)
          ? null
          : 'Enter a valid URL (http or https).'
        const nextBackgroundError =
          backgroundImageUrl.trim() === '' || isSafeHref(normalizeUrl(backgroundImageUrl))
            ? null
            : 'Enter a valid image URL, or leave this empty.'
        setUrlError(nextUrlError)
        setBackgroundError(nextBackgroundError)
        if (nextUrlError || nextBackgroundError) return false
        await updateLink(link.id, {
          title,
          url,
          backgroundImageUrl: backgroundImageUrl || undefined,
        })
      }}
    >
      <Field>
        <FieldLabel htmlFor="link-title">Title</FieldLabel>
        <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field data-invalid={urlError ? true : undefined}>
        <FieldLabel htmlFor="link-url">URL</FieldLabel>
        <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} />
        <FieldError>{urlError}</FieldError>
      </Field>

      <Field data-invalid={backgroundError ? true : undefined}>
        <FieldLabel htmlFor="link-background">Background image URL</FieldLabel>
        <Input
          id="link-background"
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
        />
        <FieldError>{backgroundError}</FieldError>
      </Field>
    </EditDialog>
  )
}
