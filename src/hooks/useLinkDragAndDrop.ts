import { useEffect, useRef } from 'react'
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useAppState } from '../context/useAppState'
import { parseDashboardDropId } from '../lib/dashboardDropId'
import type { Link } from '../types'

export function useLinkDragAndDrop(activeDashboardId: string | null, activeLinks: Link[]) {
  const { reorderLinks, moveLinkToDashboard } = useAppState()
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

  function handleDragStart() {
    dragOccurredRef.current = true
  }

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

  return { sensors, handleDragStart, handleDragEnd }
}
