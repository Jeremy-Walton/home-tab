import { PlusIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <h1 className="font-heading text-xl font-semibold text-foreground">Welcome to Launch Tabs!</h1>
      <p className="text-sm">Add your first link to get started.</p>
      <Button onClick={onAddLink}>
        <PlusIcon /> Add link
      </Button>
    </div>
  )
}
