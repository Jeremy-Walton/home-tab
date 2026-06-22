import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PlusIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { dashboardDropId } from '../lib/dashboardDropId'
import { ConfirmDialog } from './ConfirmDialog'
import { DashboardEditModal } from './DashboardEditModal'
import { EntityOptionsMenu } from './EntityOptionsMenu'
import { Button } from './ui/button'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import type { Dashboard } from '../types'

function DashboardTabItem({ dashboard }: { dashboard: Dashboard }) {
  const { dashboards, deleteDashboard } = useAppState()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { isOver, setNodeRef } = useDroppable({ id: dashboardDropId(dashboard.id) })

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-full transition-shadow ${isOver ? 'ring-2 ring-ring' : ''}`}
    >
      <TabsTrigger value={dashboard.id} className="max-w-40 pr-6">
        <span className="truncate">{dashboard.name}</span>
      </TabsTrigger>

      <EntityOptionsMenu
        label="Dashboard options"
        variant="ghost"
        triggerClassName="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
        onTriggerClick={(e) => e.stopPropagation()}
        onEdit={() => setEditing(true)}
        onDelete={() => setConfirmingDelete(true)}
        deleteDisabled={dashboards.length <= 1}
      />

      {editing && <DashboardEditModal dashboard={dashboard} onClose={() => setEditing(false)} />}

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-1 rounded-full"
              aria-label="Add dashboard"
              onClick={() => void addDashboard('New dashboard')}
            >
              <PlusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add dashboard</TooltipContent>
        </Tooltip>
      </TabsList>
    </Tabs>
  )
}
