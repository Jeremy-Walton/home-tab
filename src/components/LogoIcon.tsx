import { cn } from '@/lib/utils'

export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" role="img" aria-label="LaunchTabs" className={cn('size-6', className)}>
      <rect x="32" y="32" width="448" height="448" rx="96" fill="#f1f3f3" />
      <polygon points="256,90 170,199 342,199" fill="#007a55" />
      <rect x="218" y="180" width="76" height="174" fill="#007a55" />
      <polygon points="225,345 287,345 256,423" fill="#009966" />
      <polygon points="241,355 271,355 256,399" fill="#ecfdf5" />
      <circle cx="218" cy="386" r="12" fill="#67787c" opacity="0.3" />
      <circle cx="301" cy="398" r="9" fill="#67787c" opacity="0.22" />
      <circle cx="255" cy="423" r="15" fill="#67787c" opacity="0.16" />
    </svg>
  )
}
