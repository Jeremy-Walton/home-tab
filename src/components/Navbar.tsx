import { DashboardTabs } from './DashboardTabs'
import { ImportExportBar } from './ImportExportBar'

export function Navbar() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-4 py-2">
      <span className="font-heading text-lg font-semibold">LaunchTabs</span>
      <DashboardTabs />
      <ImportExportBar className="ml-auto" />
    </nav>
  )
}
