import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PlusIcon } from '@phosphor-icons/react'
import { useAppState } from '../../context/useAppState'
import { useAltHeld } from '../../hooks/useAltHeld'
import { dashboardDropId } from '../../lib/dashboardDropId'
import { dashboardShortcutDigit, MAX_DASHBOARD_SHORTCUTS } from '../../lib/keyboard'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DashboardEditModal } from '@/components/DashboardEditModal'
import { EntityOptionsMenu } from '@/components/EntityOptionsMenu/EntityOptionsMenu'
import { Badge } from '@/components/ui/badge/badge'
import { Button } from '@/components/ui/button/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip/tooltip'
import type { Dashboard } from '../../types'
import styles from './DashboardTabs.module.css'

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
      className={cn(styles.dashboardTab, isOver && styles.dashboardTabOver)}
    >
      <TabsTrigger
        value={dashboard.id}
        className={styles.trigger}
        hasOptionsMenu
        aria-keyshortcuts={
          index < MAX_DASHBOARD_SHORTCUTS ? `Alt+${dashboardShortcutDigit(index)}` : undefined
        }
      >
        <span className={styles.dashboardTabLabel}>{dashboard.name}</span>
      </TabsTrigger>

      {showShortcut && index < MAX_DASHBOARD_SHORTCUTS && (
        <Badge variant="shortcut" aria-hidden className={styles.shortcutBadge}>
          {dashboardShortcutDigit(index)}
        </Badge>
      )}

      <EntityOptionsMenu
        label="Dashboard options"
        variant="ghost"
        triggerClassName={styles.optionsTrigger}
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
      <TabsList className={styles.list}>
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
                className={styles.addButton}
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
