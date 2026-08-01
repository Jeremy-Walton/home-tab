import { useEffect, useState } from 'react'
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppState } from '../context/useAppState'
import { ConfirmDialog } from './ConfirmDialog'
import { EntityOptionsMenu } from './EntityOptionsMenu'
import { LinkEditModal } from './LinkEditModal'
import { AspectRatio } from './ui/aspect-ratio'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import { isSafeHref } from '../lib/url'
import type { Link } from '../types'

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.wasDragging ? false : defaultAnimateLayoutChanges(args)

export function LinkTile({ link }: { link: Link }) {
  const { dashboards, deleteLink, moveLinkToDashboard } = useAppState()
  const [imageFailed, setImageFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pressed, setPressed] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
    // The settle-on-drop layout animation can compute a wildly wrong delta
    // for long, multi-row reorders (a tile briefly flying off-screen before
    // sliding back). Skip animating that specific transition -- snap
    // instantly once a drag just ended -- while keeping the live
    // drag-preview reorder animation (which works correctly) untouched.
    animateLayoutChanges,
  })

  // Pointer capture during a real drag can retarget pointerup away from this
  // element, so its own onPointerUp/onPointerCancel handlers below aren't
  // guaranteed to fire. A window-level listener still sees the event
  // regardless of capture retargeting, matching the pattern already used in
  // useLinkDragAndDrop.ts's suppressClickAfterDrag.
  useEffect(() => {
    function clearPressed() {
      setPressed(false)
    }
    window.addEventListener('pointerup', clearPressed)
    window.addEventListener('pointercancel', clearPressed)
    return () => {
      window.removeEventListener('pointerup', clearPressed)
      window.removeEventListener('pointercancel', clearPressed)
    }
  }, [])

  const showImage = link.backgroundImageUrl && !imageFailed

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const backgroundStyle = {
    backgroundImage: showImage ? `url(${link.backgroundImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group relative w-56">
      <AspectRatio
        ratio={16 / 9}
        style={backgroundStyle}
        onPointerDown={() => setPressed(true)}
        className={cn(
          'flex flex-col items-center justify-end overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/10 transition-[box-shadow,scale] duration-150 ease-out-strong group-hover:shadow-xl dark:ring-white/10',
          pressed && 'scale-[0.98]',
        )}
      >
        {showImage && (
          <img
            src={link.backgroundImageUrl}
            alt=""
            className="hidden"
            onError={() => setImageFailed(true)}
          />
        )}

        <a
          href={isSafeHref(link.url) ? link.url : undefined}
          draggable={false}
          className="absolute inset-0 flex items-end p-2"
        >
          <Badge variant="overlay">{link.title || 'Untitled'}</Badge>
        </a>

        <div className="absolute right-1 top-1" onPointerDown={(e) => e.stopPropagation()}>
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
