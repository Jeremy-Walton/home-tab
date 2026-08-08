import { cn } from '@/lib/utils'
import styles from './kbd.module.css'

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd data-slot="kbd" className={cn(styles.kbd, className)} {...props} />
}

function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <kbd data-slot="kbd-group" className={cn(styles.kbdGroup, className)} {...props} />
}

export { Kbd, KbdGroup }
