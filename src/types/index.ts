export interface Dashboard {
  id: string
  name: string
  order: number
  backgroundImageUrl?: string
  createdAt: number
}

export interface Link {
  id: string
  dashboardId: string
  order: number
  title: string
  url: string
  backgroundImageUrl?: string
}

export interface LegacyState {
  links?: Array<{
    key?: number
    id?: number
    label?: string
    url?: string
    image?: string
    isDisabled?: boolean
    color?: string
  }>
  backgroundUrl?: string
}

export interface ExportedState {
  dashboards: Dashboard[]
  links: Link[]
  activeDashboardId: string | null
}
