import { createRxDatabase } from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import type { AppCollections, AppDatabase } from "../storage/db";
import { dashboardSchema, linkSchema } from "../storage/schemas";

let counter = 0;

export async function createTestDatabase(): Promise<AppDatabase> {
  const db = await createRxDatabase<AppCollections>({
    name: `test-db-${Date.now()}-${counter++}`,
    storage: getRxStorageMemory(),
    multiInstance: false,
  });
  await db.addCollections({
    dashboards: { schema: dashboardSchema },
    links: { schema: linkSchema },
  });
  return db;
}
