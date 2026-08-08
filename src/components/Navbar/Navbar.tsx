import { DashboardTabs } from '../DashboardTabs/DashboardTabs'
import { ImportExportBar } from '../ImportExportBar/ImportExportBar'
import { LogoIcon } from '../LogoIcon/LogoIcon'
import { Wordmark } from '../Wordmark'
import styles from './Navbar.module.css'

export function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <LogoIcon />
        <Wordmark className="h-5" /> {/* tailwind-passthrough: Wordmark converts in Part 5.5 */}
      </div>
      <DashboardTabs />
      <ImportExportBar className={styles.actions} />
    </nav>
  )
}
