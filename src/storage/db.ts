import { createRxDatabase, type RxCollection, type RxDatabase } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { dashboardSchema, linkSchema } from './schemas'
import type { Dashboard, Link } from '../types'

const originalConsoleWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('RxDB Open Core')) return
  originalConsoleWarn(...args)
}

export type AppCollections = {
  dashboards: RxCollection<Dashboard>
  links: RxCollection<Link>
}

export type AppDatabase = RxDatabase<AppCollections>

let dbPromise: Promise<AppDatabase> | null = null

export function getDatabase(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase()
  }
  return dbPromise
}

async function createDatabase(): Promise<AppDatabase> {
  const db: AppDatabase = await createRxDatabase<AppCollections>({
    name: 'launch-tabs',
    storage: getRxStorageDexie(),
  })

  await db.addCollections({
    dashboards: { schema: dashboardSchema },
    links: { schema: linkSchema },
  })

  return db
}
