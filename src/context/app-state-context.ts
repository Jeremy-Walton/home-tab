import { createContext } from 'react'
import type { Dashboard, ExportedState, Link } from '../types'

export interface AppStateValue {
  ready: boolean
  dashboards: Dashboard[]
  links: Link[]
  activeDashboardId: string | null
  setActiveDashboardId: (id: string) => void
  addDashboard: (name: string) => Promise<void>
  renameDashboard: (id: string, name: string) => Promise<void>
  deleteDashboard: (id: string) => Promise<void>
  addLink: (dashboardId: string) => Promise<void>
  updateLink: (
    id: string,
    fields: Partial<Pick<Link, 'title' | 'url' | 'backgroundImageUrl' | 'backgroundColor'>>,
  ) => Promise<void>
  deleteLink: (id: string) => Promise<void>
  reorderLinks: (dashboardId: string, orderedIds: string[]) => Promise<void>
  moveLinkToDashboard: (linkId: string, targetDashboardId: string) => Promise<void>
  exportState: () => ExportedState
  importState: (data: unknown) => Promise<void>
}

export const AppStateContext = createContext<AppStateValue | null>(null)
