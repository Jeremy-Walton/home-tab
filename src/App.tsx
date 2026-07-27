import { useState } from 'react'
import { closestCenter, DndContext } from '@dnd-kit/core'
import { AppStateProvider } from './context/AppStateContext'
import { useAppState } from './context/useAppState'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinkDragAndDrop } from './hooks/useLinkDragAndDrop'
import { DashboardGrid } from './components/DashboardGrid'
import { LinkEditModal } from './components/LinkEditModal'
import { Navbar } from './components/Navbar'
import { TooltipProvider } from './components/ui/tooltip'

function Dashboard() {
  const { ready, dashboards, links, activeDashboardId, setActiveDashboardId, addLink } =
    useAppState()
  const activeLinks = links.filter((l) => l.dashboardId === activeDashboardId)
  const { sensors, handleDragStart, handleDragEnd } = useLinkDragAndDrop(
    activeDashboardId,
    activeLinks,
  )
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)

  async function handleAddLink() {
    if (!activeDashboardId) return
    const id = await addLink(activeDashboardId)
    if (id) setEditingLinkId(id)
  }

  useKeyboardShortcuts({
    dashboards,
    activeDashboardId,
    setActiveDashboardId,
    onAddLink: () => void handleAddLink(),
  })

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>
  }

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId)
  const editingLink = links.find((l) => l.id === editingLinkId)

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
              onAddLink={() => void handleAddLink()}
            />
          )}
        </div>
      </div>
      {editingLink && (
        <LinkEditModal link={editingLink} onClose={() => setEditingLinkId(null)} />
      )}
      <div className="pointer-events-none fixed bottom-2 right-3 text-xs text-white/70">
        <span>© 2026 Jeremy Walton. All Rights Reserved.</span>{' '}
        <a
          href="https://chromewebstore.google.com/detail/new-tab-redirect/icpgjfneehieebagbmdbhnlpiopdcmna?hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto underline hover:text-white"
        >
          Use this extension to redirect to this page when opening a new tab.
        </a>
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
