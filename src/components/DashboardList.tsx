import { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { DotsThreeVerticalIcon, PlusIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { dashboardDropId } from '../lib/dashboardDropId'
import { ConfirmDialog } from './ConfirmDialog'
import { Input } from './ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar'
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
    <SidebarMenuItem ref={setNodeRef} className={isOver ? 'rounded-xl ring-2 ring-ring' : ''}>
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
        <SidebarMenuButton isActive={isActive} onClick={() => setActiveDashboardId(dashboard.id)}>
          <span className="truncate">{dashboard.name}</span>
        </SidebarMenuButton>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label="Dashboard options">
            <DotsThreeVerticalIcon weight="bold" />
          </SidebarMenuAction>
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
    </SidebarMenuItem>
  )
}

export function DashboardList() {
  const { dashboards, activeDashboardId, addDashboard } = useAppState()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {dashboards.map((dashboard) => (
            <DashboardListItem
              key={dashboard.id}
              dashboard={dashboard}
              isActive={dashboard.id === activeDashboardId}
            />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-primary"
              onClick={() => void addDashboard('New dashboard')}
            >
              <PlusIcon /> Add dashboard
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
