import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import styles from './badge.module.css'

const badgeVariants = cva(styles.badge, {
  variants: {
    variant: {
      default: styles.badgeDefault,
      secondary: styles.badgeSecondary,
      destructive: styles.badgeDestructive,
      outline: styles.badgeOutline,
      ghost: styles.badgeGhost,
      link: styles.badgeLink,
      overlay: styles.badgeOverlay,
      shortcut: styles.badgeShortcut,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
