import { useEffect, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { AppStateProvider } from './context/AppStateContext'
import { useAppState } from './context/useAppState'
import { DashboardList } from './components/DashboardList'
import { DashboardGrid } from './components/DashboardGrid'
import { ImportExportBar } from './components/ImportExportBar'
import { parseDashboardDropId } from './lib/dashboardDropId'

function Dashboard() {
  const { ready, dashboards, links, activeDashboardId, addLink, reorderLinks, moveLinkToDashboard } =
    useAppState()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // dnd-kit reorders the DOM during a drag, so the click that follows a real
  // drag can land on a freshly-mounted anchor that never had a listener
  // attached -- a per-tile onClick guard can't reliably catch it. Suppress
  // navigation globally instead, keyed off whether a drag actually started.
  const dragOccurredRef = useRef(false)
  useEffect(() => {
    function suppressClickAfterDrag(e: MouseEvent) {
      if (dragOccurredRef.current) {
        e.preventDefault()
        dragOccurredRef.current = false
      }
    }
    window.addEventListener('click', suppressClickAfterDrag, true)
    return () => window.removeEventListener('click', suppressClickAfterDrag, true)
  }, [])

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>
  }

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId)
  const activeLinks = links.filter((l) => l.dashboardId === activeDashboardId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !activeDashboardId) return

    const targetDashboardId = parseDashboardDropId(String(over.id))

    if (targetDashboardId) {
      if (targetDashboardId !== activeDashboardId) {
        void moveLinkToDashboard(String(active.id), targetDashboardId)
      }
      return
    }

    if (active.id === over.id) return

    const sorted = [...activeLinks].sort((a, b) => a.order - b.order)
    const fromIndex = sorted.findIndex((l) => l.id === active.id)
    const toIndex = sorted.findIndex((l) => l.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    void reorderLinks(activeDashboardId, reordered.map((l) => l.id))
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={() => {
        dragOccurredRef.current = true
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col">
            <DashboardList />
            <ImportExportBar />
          </div>
          {activeDashboard && (
            <DashboardGrid
              links={activeLinks}
              backgroundImageUrl={activeDashboard.backgroundImageUrl}
              onAddLink={() => void addLink(activeDashboard.id)}
            />
          )}
        </div>
      </div>
    </DndContext>
  )
}

function App() {
  return (
    <AppStateProvider>
      <Dashboard />
    </AppStateProvider>
  )
}

export default App
