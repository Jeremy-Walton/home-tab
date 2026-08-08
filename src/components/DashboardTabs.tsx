import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PlusIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { useAltHeld } from '../hooks/useAltHeld'
import { dashboardDropId } from '../lib/dashboardDropId'
import { dashboardShortcutDigit, MAX_DASHBOARD_SHORTCUTS } from '../lib/keyboard'
import { ConfirmDialog } from './ConfirmDialog'
import { DashboardEditModal } from './DashboardEditModal'
import { EntityOptionsMenu } from './EntityOptionsMenu'
import { Badge } from './ui/badge/badge'
import { Button } from './ui/button/button'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip/tooltip'
import type { Dashboard } from '../types'

function DashboardTabItem({
  dashboard,
  index,
  showShortcut,
}: {
  dashboard: Dashboard
  index: number
  showShortcut: boolean
}) {
  const { dashboards, deleteDashboard } = useAppState()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { isOver, setNodeRef } = useDroppable({ id: dashboardDropId(dashboard.id) })

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-full transition-shadow duration-100 ease-out-strong ${isOver ? 'ring-2 ring-ring' : ''}`}
    >
      <TabsTrigger
        value={dashboard.id}
        className="max-w-40"
        hasOptionsMenu
        aria-keyshortcuts={
          index < MAX_DASHBOARD_SHORTCUTS ? `Alt+${dashboardShortcutDigit(index)}` : undefined
        }
      >
        <span className="truncate">{dashboard.name}</span>
      </TabsTrigger>

      {showShortcut && index < MAX_DASHBOARD_SHORTCUTS && (
        <Badge
          variant="shortcut"
          aria-hidden
          className="pointer-events-none absolute -left-1 -top-1"
        >
          {dashboardShortcutDigit(index)}
        </Badge>
      )}

      <EntityOptionsMenu
        label="Dashboard options"
        variant="ghost"
        triggerClassName="right-0.5 top-1/2 -translate-y-1/2"
        triggerPositioned
        revealOnHover
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
  const altHeld = useAltHeld()

  return (
    <Tabs value={activeDashboardId ?? ''} onValueChange={setActiveDashboardId}>
      <TabsList className="gap-1">
        {dashboards.map((dashboard, index) => (
          <DashboardTabItem
            key={dashboard.id}
            dashboard={dashboard}
            index={index}
            showShortcut={altHeld}
          />
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-1 rounded-full"
                aria-label="Add dashboard"
                onClick={() => void addDashboard('New dashboard')}
              >
                <PlusIcon />
              </Button>
            }
          />
          <TooltipContent>Add dashboard</TooltipContent>
        </Tooltip>
      </TabsList>
    </Tabs>
  )
}
