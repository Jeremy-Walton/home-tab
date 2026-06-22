import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getDatabase, type AppDatabase } from '../storage/db'
import { generateId } from '../lib/id'
import { normalizeUrl } from '../lib/url'
import {
  isExportedState,
  isLegacyState,
  mapLegacyState,
  serializeState,
} from '../lib/importExport'
import type { Dashboard, ExportedState, Link } from '../types'
import { AppStateContext, type AppStateValue } from './app-state-context'

const ACTIVE_DASHBOARD_KEY = 'launch-tabs:activeDashboardId'
const LEGACY_STORAGE_KEY = 'state'

function linksEqual(a: Link[], b: Link[]): boolean {
  if (a.length !== b.length) return false
  const byId = new Map(a.map((link) => [link.id, link]))
  return b.every((link) => {
    const prev = byId.get(link.id)
    return (
      prev !== undefined &&
      prev.dashboardId === link.dashboardId &&
      prev.order === link.order &&
      prev.title === link.title &&
      prev.url === link.url &&
      prev.backgroundImageUrl === link.backgroundImageUrl
    )
  })
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AppDatabase | null>(null)
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [activeDashboardId, setActiveDashboardIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_DASHBOARD_KEY),
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let dashboardsSub: { unsubscribe: () => void } | undefined
    let linksSub: { unsubscribe: () => void } | undefined

    getDatabase().then((database) => {
      setDb(database)

      // The first emission from a reactive query can arrive before the
      // persisted IndexedDB data has actually loaded. Only flip `ready`
      // once dashboards have emitted for real, so the bootstrap effect
      // below never mistakes "not loaded yet" for "no dashboards exist".
      dashboardsSub = database.dashboards.find().$.subscribe((docs) => {
        setDashboards(docs.map((d) => d.toJSON()))
        setReady(true)
      })
      linksSub = database.links.find().$.subscribe((docs) => {
        const next = docs.map((d) => d.toJSON())
        // After reorderLinks/moveLinkToDashboard apply the new order
        // optimistically, this subscription still fires once the write
        // resolves -- with the same data but new array/object references.
        // That redundant render, arriving while the layout-change animation
        // from the optimistic update is still mid-flight, was causing
        // dnd-kit to compute a bogus correction (a visible overshoot).
        // Skip it when nothing actually changed.
        setLinks((prev) => (linksEqual(prev, next) ? prev : next))
      })
    })

    return () => {
      dashboardsSub?.unsubscribe()
      linksSub?.unsubscribe()
    }
  }, [])

  // Bootstrap: pull in the previous app's localStorage.state whenever it's
  // present (regardless of whether dashboards already exist -- it may show
  // up after a Default dashboard was already created on an earlier visit),
  // otherwise create an empty Default dashboard if none exist yet. Guarded
  // by a ref since this does multiple awaited writes and the dependencies
  // it cares about won't change again until they land.
  const bootstrapping = useRef(false)
  useEffect(() => {
    if (!ready || !db) return
    if (bootstrapping.current) return

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw && dashboards.length > 0) return

    bootstrapping.current = true
    const database = db

    async function bootstrap() {
      if (legacyRaw) {
        try {
          const legacyData = JSON.parse(legacyRaw)
          if (isLegacyState(legacyData)) {
            const { dashboard, links: importedLinks } = mapLegacyState(legacyData)
            await database.dashboards.insert(dashboard)
            await database.links.bulkInsert(importedLinks)
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            setActiveDashboardId(dashboard.id)
            return
          }
        } catch {
          // Malformed legacy data -- drop it below so we don't loop on it.
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }

      if (dashboards.length === 0) {
        const doc = await database.dashboards.insert({
          id: generateId(),
          name: 'Default',
          createdAt: Date.now(),
        })
        setActiveDashboardId(doc.id)
      }
    }

    void bootstrap().finally(() => {
      bootstrapping.current = false
    })
  }, [ready, db, dashboards.length])

  // Keep the active dashboard valid.
  useEffect(() => {
    if (!ready || dashboards.length === 0) return
    const stillExists = dashboards.some((d) => d.id === activeDashboardId)
    if (!stillExists) {
      setActiveDashboardId(dashboards[0].id)
    }
  }, [ready, dashboards, activeDashboardId])

  function setActiveDashboardId(id: string) {
    localStorage.setItem(ACTIVE_DASHBOARD_KEY, id)
    setActiveDashboardIdState(id)
  }

  async function addDashboard(name: string) {
    if (!db) return
    const doc = await db.dashboards.insert({
      id: generateId(),
      name,
      createdAt: Date.now(),
    })
    setActiveDashboardId(doc.id)
  }

  async function updateDashboard(
    id: string,
    fields: Partial<Pick<Dashboard, 'name' | 'backgroundImageUrl'>>,
  ) {
    if (!db) return
    const doc = await db.dashboards.findOne(id).exec()
    const patch = { ...fields }
    if (patch.backgroundImageUrl !== undefined) {
      patch.backgroundImageUrl = normalizeUrl(patch.backgroundImageUrl)
    }
    await doc?.patch(patch)
  }

  async function deleteDashboard(id: string) {
    if (!db) return
    if (dashboards.length <= 1) return

    const linksToDelete = await db.links.find({ selector: { dashboardId: id } }).exec()
    await Promise.all(linksToDelete.map((l) => l.remove()))

    const doc = await db.dashboards.findOne(id).exec()
    await doc?.remove()
  }

  async function addLink(dashboardId: string) {
    if (!db) return
    const existing = links.filter((l) => l.dashboardId === dashboardId)
    const order = existing.length === 0 ? 0 : Math.max(...existing.map((l) => l.order)) + 1

    await db.links.insert({
      id: generateId(),
      dashboardId,
      order,
      title: 'New link',
      url: 'https://example.com',
    })
  }

  async function updateLink(
    id: string,
    fields: Partial<Pick<Link, 'title' | 'url' | 'backgroundImageUrl'>>,
  ) {
    if (!db) return
    const doc = await db.links.findOne(id).exec()
    const patch = { ...fields }
    if (patch.url !== undefined) {
      patch.url = normalizeUrl(patch.url)
    }
    if (patch.backgroundImageUrl !== undefined) {
      patch.backgroundImageUrl = normalizeUrl(patch.backgroundImageUrl)
    }
    await doc?.patch(patch)
  }

  async function deleteLink(id: string) {
    if (!db) return
    const doc = await db.links.findOne(id).exec()
    await doc?.remove()
  }

  async function reorderLinks(dashboardId: string, orderedIds: string[]) {
    if (!db) return

    const reordered = links.map((link) => {
      if (link.dashboardId !== dashboardId) return link
      const newOrder = orderedIds.indexOf(link.id)
      return newOrder === -1 ? link : { ...link, order: newOrder }
    })

    // dnd-kit's drag preview reverts the instant you drop, before this
    // persists. Apply the new order to local state immediately so the UI
    // doesn't flash back to the pre-drag layout while the RxDB write (and
    // the round trip back through the reactive subscription) catches up.
    setLinks(reordered)

    // One bulk write, not N concurrent findOne+patch calls -- each patch()
    // triggers its own reactive emission as soon as it resolves, so doing
    // them one at a time caused the subscription to overwrite the
    // optimistic update above with partially-reordered intermediate states,
    // each one its own visible jump.
    await db.links.bulkUpsert(reordered.filter((l) => l.dashboardId === dashboardId))
  }

  async function moveLinkToDashboard(linkId: string, targetDashboardId: string) {
    if (!db) return
    const existing = links.filter((l) => l.dashboardId === targetDashboardId)
    const order = existing.length === 0 ? 0 : Math.max(...existing.map((l) => l.order)) + 1

    const doc = await db.links.findOne(linkId).exec()
    await doc?.patch({ dashboardId: targetDashboardId, order })
  }

  function exportState(): ExportedState {
    return serializeState(dashboards, links, activeDashboardId)
  }

  async function importState(data: unknown) {
    if (!db) return

    if (isLegacyState(data)) {
      const { dashboard, links: importedLinks } = mapLegacyState(data)
      await db.dashboards.insert(dashboard)
      await db.links.bulkInsert(importedLinks)
      setActiveDashboardId(dashboard.id)
      return
    }

    if (isExportedState(data)) {
      await db.dashboards.bulkUpsert(data.dashboards)
      await db.links.bulkUpsert(data.links)
      if (data.activeDashboardId) {
        setActiveDashboardId(data.activeDashboardId)
      }
      return
    }

    throw new Error('Unrecognized import file format.')
  }

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      dashboards,
      links,
      activeDashboardId,
      setActiveDashboardId,
      addDashboard,
      updateDashboard,
      deleteDashboard,
      addLink,
      updateLink,
      deleteLink,
      reorderLinks,
      moveLinkToDashboard,
      exportState,
      importState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, dashboards, links, activeDashboardId, db],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
