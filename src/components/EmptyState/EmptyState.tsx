import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty/empty'
import styles from './EmptyState.module.css'

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className={styles.emptyState}>
      <Empty fluid={false} className={styles.card}>
        <EmptyHeader>
          <EmptyTitle>Welcome to Launch Tabs!</EmptyTitle>
          <EmptyDescription>Add your first link to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className={styles.action} onClick={onAddLink}>
            <PlusIcon /> Add link
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
