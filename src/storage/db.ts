import { addRxPlugin, createRxDatabase, type RxCollection, type RxDatabase } from "rxdb";
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import type { Dashboard, Link } from "../types";
import { dashboardSchema, linkSchema } from "./schemas";

// Many new tabs share one browser; only the leader tab runs sync.
addRxPlugin(RxDBLeaderElectionPlugin);

const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("RxDB Open Core")) return;
  originalConsoleWarn(...args);
};

export type AppCollections = {
  dashboards: RxCollection<Dashboard>;
  links: RxCollection<Link>;
};

export type AppDatabase = RxDatabase<AppCollections>;

let dbPromise: Promise<AppDatabase> | null = null;

export function getDatabase(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}

// ponytail: joining a key switches database (wiping would push tombstones); orphans the old one.
export const DB_NAME_STORAGE_KEY = "launch-tabs:dbName";

async function createDatabase(): Promise<AppDatabase> {
  const db: AppDatabase = await createRxDatabase<AppCollections>({
    name: localStorage.getItem(DB_NAME_STORAGE_KEY) ?? "launch-tabs",
    storage: getRxStorageDexie(),
  });

  await db.addCollections({
    dashboards: { schema: dashboardSchema },
    links: { schema: linkSchema },
  });

  return db;
}
