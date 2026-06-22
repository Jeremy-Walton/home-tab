import { generateId } from './id'
import { normalizeUrl } from './url'
import type { Dashboard, ExportedState, LegacyState, Link } from '../types'

export function isLegacyState(data: unknown): data is LegacyState {
  if (typeof data !== 'object' || data === null) return false
  if ('dashboards' in data) return false
  return 'links' in data || 'backgroundUrl' in data
}

export function mapLegacyState(
  legacy: LegacyState,
  nextOrder = 0,
): {
  dashboard: Dashboard
  links: Link[]
} {
  const dashboardId = generateId()
  const dashboard: Dashboard = {
    id: dashboardId,
    name: 'Imported',
    order: nextOrder,
    backgroundImageUrl: legacy.backgroundUrl || undefined,
    createdAt: Date.now(),
  }

  const rawLinks = Array.isArray(legacy.links) ? legacy.links : []
  const links: Link[] = rawLinks.map((link, index) => ({
    id: generateId(),
    dashboardId,
    order: index,
    title: link.label ?? '',
    url: normalizeUrl(link.url ?? ''),
    backgroundImageUrl: link.image || undefined,
  }))

  return { dashboard, links }
}

export function serializeState(
  dashboards: Dashboard[],
  links: Link[],
  activeDashboardId: string | null,
): ExportedState {
  return { dashboards, links, activeDashboardId }
}

export function isExportedState(data: unknown): data is ExportedState {
  return (
    typeof data === 'object' &&
    data !== null &&
    'dashboards' in data &&
    'links' in data
  )
}
