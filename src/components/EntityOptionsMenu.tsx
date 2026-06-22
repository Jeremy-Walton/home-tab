import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

export function EntityOptionsMenu({
  label,
  variant,
  triggerClassName,
  onTriggerClick,
  onEdit,
  onDelete,
  deleteDisabled,
}: EntityOptionsMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={deleteDisabled} onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
