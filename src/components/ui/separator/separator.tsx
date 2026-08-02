import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import styles from './separator.module.css'

const separatorVariants = cva(styles.separator, {
  variants: {
    orientation: {
      horizontal: styles.separatorHorizontal,
      vertical: styles.separatorVertical,
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
})

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(separatorVariants({ orientation }), className)}
      {...props}
    />
  )
}

export { Separator }
