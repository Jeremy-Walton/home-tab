import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useAppState } from '../context/useAppState'
import { dashboardDropId } from '../lib/dashboardDropId'
import { ConfirmDialog } from './ConfirmDialog'
import type { Dashboard } from '../types'

function DashboardListItem({ dashboard, isActive }: { dashboard: Dashboard; isActive: boolean }) {
  const { dashboards, setActiveDashboardId, renameDashboard, deleteDashboard } = useAppState()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(dashboard.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { isOver, setNodeRef } = useDroppable({ id: dashboardDropId(dashboard.id) })

  function commitRename() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== dashboard.name) {
      void renameDashboard(dashboard.id, trimmed)
    }
    setRenaming(false)
  }

  return (
    <li
      ref={setNodeRef}
      className={`group relative flex items-center justify-between rounded px-2 py-1 text-sm ${
        isActive ? 'bg-blue-100 font-medium text-blue-900' : 'hover:bg-gray-100'
      } ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          className="w-full rounded border px-1 text-sm"
        />
      ) : (
        <button
          className="flex-1 truncate text-left"
          onClick={() => setActiveDashboardId(dashboard.id)}
        >
          {dashboard.name}
        </button>
      )}

      <div className="relative">
        <button
          className="ml-1 hidden rounded px-1 text-gray-500 hover:bg-gray-200 group-hover:block"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Dashboard options"
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-32 rounded border bg-white shadow-md">
            <button
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                setRenaming(true)
                setMenuOpen(false)
              }}
            >
              Rename
            </button>
            <button
              disabled={dashboards.length <= 1}
              className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-gray-50 disabled:text-gray-300"
              onClick={() => {
                setConfirmingDelete(true)
                setMenuOpen(false)
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          message={`Delete "${dashboard.name}" and all its links? This cannot be undone.`}
          onConfirm={() => {
            void deleteDashboard(dashboard.id)
            setConfirmingDelete(false)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  )
}

export function DashboardList() {
  const { dashboards, activeDashboardId, addDashboard } = useAppState()

  return (
    <div className="w-48 shrink-0 border-r border-gray-200 p-2">
      <ul className="space-y-0.5">
        {dashboards.map((dashboard) => (
          <DashboardListItem
            key={dashboard.id}
            dashboard={dashboard}
            isActive={dashboard.id === activeDashboardId}
          />
        ))}
      </ul>
      <button
        className="mt-2 w-full rounded px-2 py-1 text-left text-sm text-blue-600 hover:bg-blue-50"
        onClick={() => void addDashboard('New dashboard')}
      >
        + Add dashboard
      </button>
    </div>
  )
}
