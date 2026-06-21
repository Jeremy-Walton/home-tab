import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { LinkTile } from './LinkTile'
import { EmptyState } from './EmptyState'
import type { Link } from '../types'

interface DashboardGridProps {
  links: Link[]
  backgroundImageUrl?: string
  onAddLink: () => void
}

export function DashboardGrid({ links, backgroundImageUrl, onAddLink }: DashboardGridProps) {
  const sorted = [...links].sort((a, b) => a.order - b.order)

  return (
    <div
      className="flex flex-1 flex-col bg-cover bg-center p-6"
      style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined }}
    >
      {sorted.length === 0 ? (
        <EmptyState onAddLink={onAddLink} />
      ) : (
        <SortableContext items={sorted.map((l) => l.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-4">
            {sorted.map((link) => (
              <LinkTile key={link.id} link={link} />
            ))}
            <button
              onClick={onAddLink}
              className="flex aspect-square w-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-3xl text-gray-400 hover:border-gray-400 hover:text-gray-500"
              aria-label="Add link"
            >
              +
            </button>
          </div>
        </SortableContext>
      )}
    </div>
  )
}
