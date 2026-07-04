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
    backgroundImageUrl: legacy.backgroundUrl ? normalizeUrl(legacy.backgroundUrl) : undefined,
    createdAt: Date.now(),
  }

  const rawLinks = Array.isArray(legacy.links) ? legacy.links : []
  const links: Link[] = rawLinks.map((link, index) => ({
    id: generateId(),
    dashboardId,
    order: index,
    title: link.label ?? '',
    url: normalizeUrl(link.url ?? ''),
    backgroundImageUrl: link.image ? normalizeUrl(link.image) : undefined,
  }))

  return { dashboard, links }
}

/**
 * Version of the export file format written by `serializeState`. Bump this
 * when the exported shape changes, and keep readers for all older versions
 * (versions 0 and 1 are shape-identical — `version` was simply absent
 * before this constant was introduced).
 */
export const CURRENT_EXPORT_VERSION = 1

export function serializeState(
  dashboards: Dashboard[],
  links: Link[],
  activeDashboardId: string | null,
): ExportedState {
  return { version: CURRENT_EXPORT_VERSION, dashboards, links, activeDashboardId }
}

function isDashboardRecord(value: unknown): value is Dashboard {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    d.id !== '' &&
    typeof d.name === 'string' &&
    typeof d.order === 'number' &&
    Number.isFinite(d.order) &&
    typeof d.createdAt === 'number' &&
    (d.backgroundImageUrl === undefined || typeof d.backgroundImageUrl === 'string')
  )
}

function isLinkRecord(value: unknown): value is Link {
  if (typeof value !== 'object' || value === null) return false
  const l = value as Record<string, unknown>
  return (
    typeof l.id === 'string' &&
    l.id !== '' &&
    typeof l.dashboardId === 'string' &&
    l.dashboardId !== '' &&
    typeof l.order === 'number' &&
    Number.isFinite(l.order) &&
    typeof l.title === 'string' &&
    typeof l.url === 'string' &&
    (l.backgroundImageUrl === undefined || typeof l.backgroundImageUrl === 'string')
  )
}

export function isExportedState(data: unknown): data is ExportedState {
  if (typeof data !== 'object' || data === null) return false
  const candidate = data as Record<string, unknown>
  if (!Array.isArray(candidate.dashboards) || !Array.isArray(candidate.links)) return false
  if (
    candidate.activeDashboardId !== undefined &&
    candidate.activeDashboardId !== null &&
    typeof candidate.activeDashboardId !== 'string'
  ) {
    return false
  }
  // `version` absent means version 0, which is shape-identical to version 1
  // (the version marker was introduced without changing the shape).
  if (candidate.version !== undefined) {
    if (typeof candidate.version !== 'number') return false
    if (candidate.version > CURRENT_EXPORT_VERSION) return false
  }
  return candidate.dashboards.every(isDashboardRecord) && candidate.links.every(isLinkRecord)
}

/**
 * Copies only the known fields (imported files may carry extras that would
 * otherwise be persisted verbatim) and normalizes every URL field. The
 * `version` marker is a file-format concern only — it never flows into the
 * in-app state handed to `bulkUpsert`, so it's intentionally dropped here.
 */
export function sanitizeExportedState(state: ExportedState): ExportedState {
  const dashboards: Dashboard[] = state.dashboards.map((d) => ({
    id: d.id,
    name: d.name,
    order: d.order,
    createdAt: d.createdAt,
    ...(d.backgroundImageUrl ? { backgroundImageUrl: normalizeUrl(d.backgroundImageUrl) } : {}),
  }))
  const links: Link[] = state.links.map((l) => ({
    id: l.id,
    dashboardId: l.dashboardId,
    order: l.order,
    title: l.title,
    url: normalizeUrl(l.url),
    ...(l.backgroundImageUrl ? { backgroundImageUrl: normalizeUrl(l.backgroundImageUrl) } : {}),
  }))
  return {
    dashboards,
    links,
    activeDashboardId:
      typeof state.activeDashboardId === 'string' ? state.activeDashboardId : null,
  }
}
