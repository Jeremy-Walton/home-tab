import { closestCenter, DndContext } from '@dnd-kit/core'
import { AppStateProvider } from './context/AppStateContext'
import { useAppState } from './context/useAppState'
import { useLinkDragAndDrop } from './hooks/useLinkDragAndDrop'
import { DashboardGrid } from './components/DashboardGrid'
import { Navbar } from './components/Navbar'
import { TooltipProvider } from './components/ui/tooltip'

function Dashboard() {
  const { ready, dashboards, links, activeDashboardId, addLink } = useAppState()
  const activeLinks = links.filter((l) => l.dashboardId === activeDashboardId)
  const { sensors, handleDragStart, handleDragEnd } = useLinkDragAndDrop(
    activeDashboardId,
    activeLinks,
  )

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>
  }

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
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
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </AppStateProvider>
  )
}

export default App
