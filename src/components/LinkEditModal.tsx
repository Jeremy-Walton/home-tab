import { useState } from 'react'
import { useAppState } from '../context/useAppState'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-96 rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Edit link</h2>

        <label className="mb-2 block text-xs text-gray-600">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </label>

        <label className="mb-2 block text-xs text-gray-600">
          URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </label>

        <label className="mb-2 block text-xs text-gray-600">
          Background image URL
          <input
            value={backgroundImageUrl}
            onChange={(e) => setBackgroundImageUrl(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </label>

        <label className="mb-3 block text-xs text-gray-600">
          Background color
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="mt-1 h-8 w-full rounded border"
          />
        </label>

        <label className="mb-4 block text-xs text-gray-600">
          Move to dashboard
          <select
            defaultValue=""
            onChange={(e) => void handleMove(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
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

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
