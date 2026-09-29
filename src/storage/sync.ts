import type { RxCollection } from "rxdb";
import { replicateRxCollection } from "rxdb/plugins/replication";
import { BehaviorSubject, Subject, type Observable } from "rxjs";

import { DB_NAME_STORAGE_KEY, type AppCollections, type AppDatabase } from "./db";

export const SYNC_KEY_STORAGE_KEY = "launch-tabs:syncKey";

// "standby": another tab of this browser holds leadership and does the syncing.
export type SyncStatus = "standby" | "connecting" | "connected" | "offline";

export type SyncHandle = {
  status$: Observable<SyncStatus>;
  awaitInitialReplication: () => Promise<void>;
  stop: () => Promise<void>;
};

type Checkpoint = { seq: number } | null;
type CollectionName = keyof AppCollections;

const RECONNECT_MS = 5000;

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Sync request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function replicate<T>(
  collection: RxCollection<T>,
  name: CollectionName,
  key: string,
  resync$: Observable<"RESYNC">,
) {
  const base = `/api/sync/${key}/${name}`;
  return replicateRxCollection<T, Checkpoint>({
    collection,
    replicationIdentifier: `launch-tabs-${name}-${key}`,
    live: true,
    waitForLeadership: true,
    pull: {
      handler: (checkpoint, batchSize) =>
        post(`${base}/pull`, { checkpoint: checkpoint ?? null, batchSize }),
      stream$: resync$,
    },
    push: {
      handler: (rows) => post(`${base}/push`, rows),
    },
  });
}

export function startSync(db: AppDatabase, key: string): SyncHandle {
  const status$ = new BehaviorSubject<SyncStatus>("standby");
  const resync: Record<CollectionName, Subject<"RESYNC">> = {
    dashboards: new Subject(),
    links: new Subject(),
  };
  const replications = [
    replicate(db.dashboards, "dashboards", key, resync.dashboards),
    replicate(db.links, "links", key, resync.links),
  ];

  let stopped = false;
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  // The server only pokes; each poke (and every reconnect, to cover what was missed) triggers a pull.
  function connect() {
    if (stopped) return;
    status$.next("connecting");
    const url = new URL(`/api/sync/${key}/ws`, location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => {
      status$.next("connected");
      resync.dashboards.next("RESYNC");
      resync.links.next("RESYNC");
    };
    socket.onmessage = (event) => {
      const name: unknown = event.data;
      if (name === "dashboards" || name === "links") resync[name].next("RESYNC");
    };
    socket.onclose = () => {
      if (stopped) return;
      status$.next("offline");
      reconnectTimer = setTimeout(connect, RECONNECT_MS);
    };
  }

  void db.waitForLeadership().then(connect);

  return {
    status$: status$.asObservable(),
    awaitInitialReplication: async () => {
      await Promise.all(replications.map((r) => r.awaitInitialReplication()));
    },
    stop: async () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
      status$.complete();
      await Promise.all(replications.map((r) => r.cancel()));
    },
  };
}

// Returns the normalized key, or throws a message fit to show the user.
export async function checkSyncKey(rawKey: string): Promise<string> {
  const key = rawKey.trim().toLowerCase();
  const response = await fetch(`/api/sync/${encodeURIComponent(key)}`).catch(() => null);
  if (!response) throw new Error("Could not reach the sync server. Check your connection.");
  const { count } = response.ok ? ((await response.json()) as { count: number }) : { count: 0 };
  if (!count) throw new Error("No synced data found for that key.");
  return key;
}

export function joinSyncKey(key: string) {
  localStorage.setItem(DB_NAME_STORAGE_KEY, `launch-tabs-${crypto.randomUUID()}`);
  localStorage.setItem(SYNC_KEY_STORAGE_KEY, key);
  location.reload();
}
