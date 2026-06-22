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
import type { Link } from '../types'

export function LinkEditModal({ link, onClose }: { link: Link; onClose: () => void }) {
  const { dashboards, updateLink, moveLinkToDashboard } = useAppState()
  const [title, setTitle] = useState(link.title)
  const [url, setUrl] = useState(link.url)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(link.backgroundImageUrl ?? '')
  const [backgroundColor, setBackgroundColor] = useState(link.backgroundColor ?? '#e5e7eb')

  async function handleSave() {
    await updateLink(link.id, {
      title,
      url,
      backgroundImageUrl: backgroundImageUrl || undefined,
      backgroundColor: backgroundColor || undefined,
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

        <label className="block text-xs text-muted-foreground">
          Title
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </label>

        <label className="block text-xs text-muted-foreground">
          URL
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1" />
        </label>

        <label className="block text-xs text-muted-foreground">
          Background image URL
          <Input
            value={backgroundImageUrl}
            onChange={(e) => setBackgroundImageUrl(e.target.value)}
            className="mt-1"
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Background color
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input"
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Move to dashboard
          <select
            defaultValue=""
            onChange={(e) => void handleMove(e.target.value)}
            className="mt-1 h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
