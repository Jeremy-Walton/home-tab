import { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { DotsThreeVerticalIcon, PlusIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { dashboardDropId } from '../lib/dashboardDropId'
import { ConfirmDialog } from './ConfirmDialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import type { Dashboard } from '../types'

function DashboardListItem({ dashboard, isActive }: { dashboard: Dashboard; isActive: boolean }) {
  const { dashboards, setActiveDashboardId, renameDashboard, deleteDashboard } = useAppState()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(dashboard.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const pendingRenameRef = useRef(false)

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
      className={`group relative flex items-center justify-between rounded-2xl px-2 py-1 text-sm ${
        isActive ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-accent/50'
      } ${isOver ? 'ring-2 ring-ring' : ''}`}
    >
      {renaming ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          className="h-7"
        />
      ) : (
        <button
          className="flex-1 truncate text-left"
          onClick={() => setActiveDashboardId(dashboard.id)}
        >
          {dashboard.name}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-1 hidden group-hover:flex"
            aria-label="Dashboard options"
          >
            <DotsThreeVerticalIcon weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={(e) => {
            // The dropdown item keeps DOM focus through its own close
            // animation, which wins a focus race against the rename
            // Input's autoFocus if we set `renaming` from onSelect directly.
            // Waiting for the dropdown's own close-focus handling to finish
            // (and suppressing its default refocus-the-trigger behavior)
            // lets the Input's autoFocus land uncontested.
            e.preventDefault()
            if (pendingRenameRef.current) {
              pendingRenameRef.current = false
              setRenaming(true)
            }
          }}
        >
          <DropdownMenuItem onSelect={() => (pendingRenameRef.current = true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={dashboards.length <= 1}
            onSelect={() => setConfirmingDelete(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    <div className="w-48 shrink-0 border-r border-border p-2">
      <ul className="space-y-0.5">
        {dashboards.map((dashboard) => (
          <DashboardListItem
            key={dashboard.id}
            dashboard={dashboard}
            isActive={dashboard.id === activeDashboardId}
          />
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start text-primary"
        onClick={() => void addDashboard('New dashboard')}
      >
        <PlusIcon /> Add dashboard
      </Button>
    </div>
  )
}
