import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { Button } from './ui/button/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface OptionsMenuProps {
  label: string
  variant: 'secondary' | 'ghost'
  size?: 'icon-xs' | 'icon-sm'
  align?: 'start' | 'end'
  triggerClassName?: string
  onTriggerClick?: (e: React.MouseEvent) => void
  revealOnHover?: boolean
  children: React.ReactNode
}

/**
 * The shared three-dot (kebab) trigger: a tooltip'd dropdown-menu button.
 * Owns the trigger shell; callers supply the menu items as children.
 */
export function OptionsMenu({
  label,
  variant,
  size = 'icon-xs',
  align = 'start',
  triggerClassName,
  onTriggerClick,
  revealOnHover,
  children,
}: OptionsMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant={variant}
                  size={size}
                  aria-label={label}
                  className={cn(
                    revealOnHover &&
                      'opacity-0 transition-opacity group-hover:opacity-100',
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
      <DropdownMenuContent align={align}>{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
