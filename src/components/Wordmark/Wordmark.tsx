import { cn } from '@/lib/utils'
import styles from './Wordmark.module.css'

export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 537 100"
      role="img"
      aria-label="LaunchTabs"
      className={cn(styles.wordmark, className)}
    >
      <text
        x="0"
        y="80"
        fontFamily="'Space Grotesk Variable', 'Space Grotesk', sans-serif"
        fontSize="96"
        letterSpacing="-1.92"
      >
        <tspan fontWeight="700" fill="currentColor">
          Launch
        </tspan>
        <tspan fontWeight="500" fill="#007a55">
          Tabs
        </tspan>
      </text>
    </svg>
  )
}
