import { PlusIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyTitle>Welcome to Launch Tabs!</EmptyTitle>
        <EmptyDescription>Add your first link to get started.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAddLink}>
          <PlusIcon /> Add link
        </Button>
      </EmptyContent>
    </Empty>
  )
}
