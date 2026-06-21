import { useEffect, useMemo, useState, type ReactNode } from 'react'
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

      dashboardsSub = database.dashboards.find().$.subscribe((docs) => {
        setDashboards(docs.map((d) => d.toJSON()))
      })
      linksSub = database.links.find().$.subscribe((docs) => {
        setLinks(docs.map((d) => d.toJSON()))
      })

      setReady(true)
    })

    return () => {
      dashboardsSub?.unsubscribe()
      linksSub?.unsubscribe()
    }
  }, [])

  // Bootstrap a default dashboard if none exist yet.
  useEffect(() => {
    if (!ready || !db) return
    if (dashboards.length > 0) return

    void db.dashboards
      .insert({
        id: generateId(),
        name: 'Default',
        createdAt: Date.now(),
      })
      .then((doc) => {
        setActiveDashboardId(doc.id)
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

  async function renameDashboard(id: string, name: string) {
    if (!db) return
    const doc = await db.dashboards.findOne(id).exec()
    await doc?.patch({ name })
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
    fields: Partial<Pick<Link, 'title' | 'url' | 'backgroundImageUrl' | 'backgroundColor'>>,
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
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const doc = await db.links.findOne(id).exec()
        if (doc && doc.dashboardId === dashboardId) {
          await doc.patch({ order: index })
        }
      }),
    )
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
      renameDashboard,
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
