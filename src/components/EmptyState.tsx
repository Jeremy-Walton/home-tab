import { PlusIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Empty className="w-80 flex-none border bg-card/90">
        <EmptyHeader>
          <EmptyTitle>Welcome to Launch Tabs!</EmptyTitle>
          <EmptyDescription>Add your first link to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="w-full" onClick={onAddLink}>
            <PlusIcon /> Add link
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
