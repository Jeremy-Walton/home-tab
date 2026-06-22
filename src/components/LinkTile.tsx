import { useState } from 'react'
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { useAppState } from '../context/useAppState'
import { ConfirmDialog } from './ConfirmDialog'
import { LinkEditModal } from './LinkEditModal'
import { AspectRatio } from './ui/aspect-ratio'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
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
        className="flex flex-col items-center justify-end overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/10 transition-shadow group-hover:shadow-xl dark:ring-white/10"
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
          <Badge className="h-auto max-w-full truncate rounded bg-black/50 text-white">
            {link.title || 'Untitled'}
          </Badge>
        </a>

        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label="Link options"
                className="relative before:absolute before:-inset-2 before:content-['']"
                onClick={(e) => e.preventDefault()}
              >
                <DotsThreeVerticalIcon weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
