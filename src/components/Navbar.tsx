import { DashboardTabs } from './DashboardTabs'
import { ImportExportBar } from './ImportExportBar'
import { LogoIcon } from './LogoIcon'
import { Wordmark } from './Wordmark'

export function Navbar() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-4 py-2">
      <div className="flex items-center gap-2">
        <LogoIcon className="size-9" />
        <Wordmark className="h-5" />
      </div>
      <DashboardTabs />
      <ImportExportBar className="ml-auto" />
    </nav>
  )
}
