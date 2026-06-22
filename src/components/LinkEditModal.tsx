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
import { Field, FieldContent, FieldGroup, FieldLabel } from './ui/field'
import type { Link } from '../types'

export function LinkEditModal({ link, onClose }: { link: Link; onClose: () => void }) {
  const { dashboards, updateLink, moveLinkToDashboard } = useAppState()
  const [title, setTitle] = useState(link.title)
  const [url, setUrl] = useState(link.url)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(link.backgroundImageUrl ?? '')

  async function handleSave() {
    await updateLink(link.id, {
      title,
      url,
      backgroundImageUrl: backgroundImageUrl || undefined,
    })
    onClose()
  }

  async function handleMove(targetDashboardId: string) {
    if (!targetDashboardId) return
    await moveLinkToDashboard(link.id, targetDashboardId)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
        </DialogHeader>

        <FieldGroup>
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

          <Field>
            <FieldLabel htmlFor="link-move">Move to dashboard</FieldLabel>
            <FieldContent>
              <select
                id="link-move"
                defaultValue=""
                onChange={(e) => void handleMove(e.target.value)}
                className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="" disabled>
                  Select a dashboard…
                </option>
                {dashboards
                  .filter((d) => d.id !== link.dashboardId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </FieldContent>
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
