import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from '../lib/utils'

interface EntityOptionsMenuProps {
  label: string
  variant: 'secondary' | 'ghost'
  triggerClassName?: string
  onTriggerClick?: (e: React.MouseEvent) => void
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
  onTriggerClick,
  onEdit,
  onDelete,
  deleteDisabled,
  moveTo,
}: EntityOptionsMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant={variant}
                  size="icon-xs"
                  aria-label={label}
                  className={cn(
                    "relative before:absolute before:-inset-2 before:content-['']",
                    triggerClassName,
                  )}
                  onClick={onTriggerClick}
                >
                  <DotsThreeVerticalIcon weight="bold" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
