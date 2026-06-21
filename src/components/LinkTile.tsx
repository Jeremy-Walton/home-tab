import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppState } from '../context/useAppState'
import { ConfirmDialog } from './ConfirmDialog'
import { LinkEditModal } from './LinkEditModal'
import type { Link } from '../types'

export function LinkTile({ link }: { link: Link }) {
  const { deleteLink } = useAppState()
  const [imageFailed, setImageFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
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
        <span className="rounded bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
          {link.title || 'Untitled'}
        </span>
      </a>

      <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
        <button
          onClick={(e) => {
            e.preventDefault()
            setEditing(true)
          }}
          className="rounded bg-white/90 px-1.5 py-0.5 text-xs hover:bg-white"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            setConfirmingDelete(true)
          }}
          className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600 hover:bg-white"
        >
          Delete
        </button>
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
