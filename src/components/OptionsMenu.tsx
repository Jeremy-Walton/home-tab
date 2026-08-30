import { cn } from '../lib/utils'
import { HoverIcon } from './icons/HoverIcon'
import { DotsThree } from './icons/dots-three'
import { Button } from './ui/button'
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
 * The shared options trigger: a tooltip'd dropdown-menu button drawn as a
 * horizontal three-dot glyph — that is the orientation the animated set ships.
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
                  <HoverIcon icon={DotsThree} weight="light" />
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
