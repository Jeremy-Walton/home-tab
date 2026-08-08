import { OptionsMenu } from '../OptionsMenu/OptionsMenu'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu/dropdown-menu'

interface EntityOptionsMenuProps {
  label: string
  variant: 'secondary' | 'ghost'
  triggerClassName?: string
  triggerPositioned?: boolean
  onTriggerClick?: (e: React.MouseEvent) => void
  revealOnHover?: boolean
  onEdit: () => void
  onDelete: () => void
  deleteDisabled?: boolean
  moveTo?: {
    options: { id: string; name: string }[]
    onSelect: (id: string) => void
  }
}

export function EntityOptionsMenu({
  label,
  variant,
  triggerClassName,
  triggerPositioned,
  onTriggerClick,
  revealOnHover,
  onEdit,
  onDelete,
  deleteDisabled,
  moveTo,
}: EntityOptionsMenuProps) {
  return (
    <OptionsMenu
      label={label}
      variant={variant}
      triggerClassName={triggerClassName}
      triggerPositioned={triggerPositioned}
      onTriggerClick={onTriggerClick}
      revealOnHover={revealOnHover}
    >
      <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
      {moveTo && moveTo.options.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to…</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {moveTo.options.map((option) => (
              <DropdownMenuItem key={option.id} onClick={() => moveTo.onSelect(option.id)}>
                {option.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <DropdownMenuItem variant="destructive" disabled={deleteDisabled} onClick={onDelete}>
        Delete
      </DropdownMenuItem>
    </OptionsMenu>
  )
}
