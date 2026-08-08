import { DashboardTabs } from '../DashboardTabs/DashboardTabs'
import { ImportExportBar } from '../ImportExportBar/ImportExportBar'
import { LogoIcon } from '../LogoIcon/LogoIcon'
import { Wordmark } from '../Wordmark/Wordmark'
import styles from './Navbar.module.css'

export function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <LogoIcon />
        <Wordmark />
      </div>
      <DashboardTabs />
      <ImportExportBar className={styles.actions} />
    </nav>
  )
}
