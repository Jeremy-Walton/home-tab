import { useState } from 'react'
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { ConfirmDialog } from './ConfirmDialog'
import { LinkEditModal } from './LinkEditModal'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import type { Link } from '../types'

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.wasDragging ? false : defaultAnimateLayoutChanges(args)

export function LinkTile({ link }: { link: Link }) {
  const { deleteLink } = useAppState()
  const [imageFailed, setImageFailed] = useState(false)
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

  const showImage = link.backgroundImageUrl && !imageFailed

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    backgroundColor: link.backgroundColor || '#e5e7eb',
    backgroundImage: showImage ? `url(${link.backgroundImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative flex aspect-square w-40 flex-col items-center justify-end overflow-hidden rounded-lg shadow"
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
        href={link.url}
        draggable={false}
        className="absolute inset-0 flex items-end p-2"
      >
        <Badge className="h-auto rounded bg-black/50 text-white">
          {link.title || 'Untitled'}
        </Badge>
      </a>

      <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
        <Button
          variant="secondary"
          size="icon-xs"
          aria-label="Edit link"
          onClick={(e) => {
            e.preventDefault()
            setEditing(true)
          }}
        >
          <PencilSimpleIcon />
        </Button>
        <Button
          variant="destructive"
          size="icon-xs"
          aria-label="Delete link"
          onClick={(e) => {
            e.preventDefault()
            setConfirmingDelete(true)
          }}
        >
          <TrashIcon />
        </Button>
      </div>

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
