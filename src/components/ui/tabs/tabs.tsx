import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import styles from './tabs.module.css'

const tabsVariants = cva(styles.tabs, {
  variants: {
    orientation: {
      horizontal: styles.tabsHorizontal,
      vertical: styles.tabsVertical,
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
})

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(tabsVariants({ orientation }), className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(styles.tabsList, {
  variants: {
    variant: {
      default: styles.tabsListDefault,
      line: styles.tabsListLine,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  hasOptionsMenu = false,
  ...props
}: TabsPrimitive.Tab.Props & {
  /** Reserves inline-end padding for a sibling options-menu trigger
   * absolutely positioned over the tab (e.g. `DashboardTabs`' kebab). */
  hasOptionsMenu?: boolean
}) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(styles.tabsTrigger, hasOptionsMenu && styles.tabsTriggerHasOptionsMenu, className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(styles.tabsContent, className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
