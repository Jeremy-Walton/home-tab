import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { LinkTile } from '../LinkTile/LinkTile'
import { EmptyState } from '../EmptyState'
import type { Link } from '../../types'
import styles from './DashboardGrid.module.css'

interface DashboardGridProps {
  links: Link[]
  backgroundImageUrl?: string
  onAddLink: () => void
}

export function DashboardGrid({ links, backgroundImageUrl, onAddLink }: DashboardGridProps) {
  const sorted = [...links].sort((a, b) => a.order - b.order)

  return (
    <div
      className={styles.dashboardGrid}
      style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined }}
    >
      {sorted.length === 0 ? (
        <EmptyState onAddLink={onAddLink} />
      ) : (
        <SortableContext items={sorted.map((l) => l.id)} strategy={rectSortingStrategy}>
          <div className={styles.dashboardGridViewport}>
            <div className={styles.dashboardGridTiles}>
              {sorted.map((link) => (
                <LinkTile key={link.id} link={link} />
              ))}
              <button
                onClick={onAddLink}
                className={styles.dashboardGridAddTile}
                aria-label="Add link"
              >
                +
              </button>
            </div>
          </div>
        </SortableContext>
      )}
    </div>
  )
}
