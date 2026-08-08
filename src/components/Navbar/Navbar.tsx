import { DashboardTabs } from '@/components/DashboardTabs/DashboardTabs'
import { ImportExportBar } from '@/components/ImportExportBar/ImportExportBar'
import { LogoIcon } from '@/components/LogoIcon/LogoIcon'
import { Wordmark } from '@/components/Wordmark/Wordmark'
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
