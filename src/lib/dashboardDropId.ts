const PREFIX = 'dashboard-'

export const dashboardDropId = (dashboardId: string) => `${PREFIX}${dashboardId}`

export function parseDashboardDropId(dropId: string): string | null {
  return dropId.startsWith(PREFIX) ? dropId.slice(PREFIX.length) : null
}
