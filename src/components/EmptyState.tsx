import { PlusIcon } from '@phosphor-icons/react'
import { Button } from './ui/button/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty/empty'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Empty
        fluid={false}
        className="w-80 border bg-card/90 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-strong"
      >
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
