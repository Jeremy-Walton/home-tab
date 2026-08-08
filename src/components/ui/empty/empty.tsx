import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import styles from './empty.module.css'

function Empty({
  className,
  fluid = true,
  ...props
}: React.ComponentProps<'div'> & {
  /** Set false to size to content instead of stretching to fill the parent
   * — e.g. a small centered card inside a bigger wrapper. */
  fluid?: boolean
}) {
  return (
    <div
      data-slot="empty"
      className={cn(styles.empty, !fluid && styles.emptyFixed, className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-header" className={cn(styles.emptyHeader, className)} {...props} />
}

const emptyMediaVariants = cva(styles.emptyMedia, {
  variants: {
    variant: {
      default: styles.emptyMediaDefault,
      icon: styles.emptyMediaIcon,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant }), className)}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-title" className={cn(styles.emptyTitle, className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(styles.emptyDescription, className)}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="empty-content" className={cn(styles.emptyContent, className)} {...props} />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
