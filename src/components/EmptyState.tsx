import { PlusIcon } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-80 bg-card/90">
        <CardHeader>
          <CardTitle>Welcome to Launch Tabs!</CardTitle>
          <CardDescription>Add your first link to get started.</CardDescription>
        </CardHeader>
        <CardFooter className="border-t">
          <Button className="w-full" onClick={onAddLink}>
            <PlusIcon /> Add link
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
