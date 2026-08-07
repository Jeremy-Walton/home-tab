import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import styles from './button.module.css'

const buttonVariants = cva(styles.button, {
  variants: {
    variant: {
      default: styles.buttonDefault,
      outline: styles.buttonOutline,
      secondary: styles.buttonSecondary,
      ghost: styles.buttonGhost,
      destructive: styles.buttonDestructive,
      link: styles.buttonLink,
    },
    size: {
      default: styles.buttonSizeDefault,
      xs: styles.buttonSizeXs,
      sm: styles.buttonSizeSm,
      lg: styles.buttonSizeLg,
      icon: styles.buttonSizeIcon,
      'icon-xs': styles.buttonSizeIconXs,
      'icon-sm': styles.buttonSizeIconSm,
      'icon-lg': styles.buttonSizeIconLg,
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

function Button({
  className,
  variant = 'default',
  size = 'default',
  positioned = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Absolutely positions the button within its own layout — e.g. a
     * dialog's corner-pinned close button, a tab's kebab trigger. */
    positioned?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        positioned && styles.buttonPositioned,
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
