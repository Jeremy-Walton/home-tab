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
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import type { Dashboard } from '../types'

function DashboardTabItem({ dashboard }: { dashboard: Dashboard }) {
  const { dashboards, renameDashboard, deleteDashboard } = useAppState()
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
    <div
      ref={setNodeRef}
      className={`group relative ${isOver ? 'rounded-full ring-2 ring-ring' : ''}`}
    >
      {renaming ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          className="h-7 w-28"
        />
      ) : (
        <TabsTrigger value={dashboard.id} className="max-w-40 pr-6">
          <span className="truncate">{dashboard.name}</span>
        </TabsTrigger>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
            aria-label="Dashboard options"
            onClick={(e) => e.stopPropagation()}
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
    </div>
  )
}

export function DashboardTabs() {
  const { dashboards, activeDashboardId, setActiveDashboardId, addDashboard } = useAppState()

  return (
    <Tabs value={activeDashboardId ?? undefined} onValueChange={setActiveDashboardId}>
      <TabsList className="gap-1">
        {dashboards.map((dashboard) => (
          <DashboardTabItem key={dashboard.id} dashboard={dashboard} />
        ))}
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-1 rounded-full"
          aria-label="Add dashboard"
          onClick={() => void addDashboard('New dashboard')}
        >
          <PlusIcon />
        </Button>
      </TabsList>
    </Tabs>
  )
}
