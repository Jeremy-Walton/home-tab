import { useState } from 'react'
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppState } from '../../context/useAppState'
import { ConfirmDialog } from '../ConfirmDialog'
import { EntityOptionsMenu } from '../EntityOptionsMenu'
import { LinkEditModal } from '../LinkEditModal'
import { AspectRatio } from '../ui/aspect-ratio/aspect-ratio'
import { Badge } from '../ui/badge/badge'
import { cn } from '../../lib/utils'
import { isSafeHref } from '../../lib/url'
import type { Link } from '../../types'
import styles from './LinkTile.module.css'

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.wasDragging ? false : defaultAnimateLayoutChanges(args)

export function LinkTile({ link }: { link: Link }) {
  const { dashboards, deleteLink, moveLinkToDashboard } = useAppState()
  // Tracked as URLs rather than booleans so that editing a tile's image
  // invalidates the previous image's load/error result instead of inheriting it.
  const [failedUrl, setFailedUrl] = useState<string>()
  const [loadedUrl, setLoadedUrl] = useState<string>()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
    // The settle-on-drop layout animation can compute a wildly wrong delta
    // for long, multi-row reorders (a tile briefly flying off-screen before
    // sliding back). Skip animating that specific transition -- snap
    // instantly once a drag just ended -- while keeping the live
    // drag-preview reorder animation (which works correctly) untouched.
    animateLayoutChanges,
  })

  const imageUrl = link.backgroundImageUrl
  const showImage = imageUrl && failedUrl !== imageUrl
  const imageLoaded = loadedUrl === imageUrl

  const style = {
    transform: CSS.Translate.toString(transform),
    // dnd-kit's own `transition` only covers `transform`, never opacity.
    transition: [transition, 'opacity 150ms var(--ease-out-strong)'].filter(Boolean).join(', '),
    opacity: isDragging ? 0.5 : 1,
    viewTransitionName: `link-${link.id}`,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // `group` is a literal Tailwind marker, not a styled class of ours —
      // OptionsMenu.tsx (not yet converted) keys its kebab's reveal-on-hover
      // off this exact literal ancestor class name.
      className={cn('group', styles.tile)}
    >
      {/* Press feedback keys off the full-bleed <a>: the kebab is painted over
          it, not inside it, so pressing the kebab can't match. */}
      <AspectRatio ratio={16 / 9} className={styles.surface}>
        {showImage && (
          <img
            ref={(node) => {
              // A cached image can finish loading before React attaches onLoad.
              if (node?.complete) setLoadedUrl(imageUrl)
            }}
            src={imageUrl}
            alt=""
            draggable={false}
            className={cn(styles.tileImage, imageLoaded && styles.tileImageLoaded)}
            onLoad={() => setLoadedUrl(imageUrl)}
            onError={() => setFailedUrl(imageUrl)}
          />
        )}

        <a href={isSafeHref(link.url) ? link.url : undefined} draggable={false} className={styles.tileLink}>
          <Badge variant="overlay">{link.title || 'Untitled'}</Badge>
        </a>

        <div className={styles.tileOptions}>
          <EntityOptionsMenu
            label="Link options"
            variant="secondary"
            revealOnHover
            onTriggerClick={(e) => e.preventDefault()}
            onEdit={() => setEditing(true)}
            onDelete={() => setConfirmingDelete(true)}
            moveTo={{
              options: dashboards
                .filter((d) => d.id !== link.dashboardId)
                .map((d) => ({ id: d.id, name: d.name })),
              onSelect: (dashboardId) => void moveLinkToDashboard(link.id, dashboardId),
            }}
          />
        </div>
      </AspectRatio>

      {editing && <LinkEditModal link={link} onClose={() => setEditing(false)} />}

      {confirmingDelete && (
        <ConfirmDialog
          message={`Delete "${link.title || 'this link'}"?`}
          onConfirm={() => {
            void deleteLink(link.id)
            setConfirmingDelete(false)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
