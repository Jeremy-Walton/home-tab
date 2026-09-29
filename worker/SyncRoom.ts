import { DurableObject } from "cloudflare:workers";

import { sameDoc } from "./conflict";

type Doc = { id: string; _deleted: boolean } & Record<string, unknown>;
type PushRow = { assumedMasterState?: Doc; newDocumentState: Doc };
type Checkpoint = { seq: number } | null;

const COLLECTIONS = new Set(["dashboards", "links"]);

function isPushRows(body: unknown): body is PushRow[] {
  return (
    Array.isArray(body) &&
    body.every(
      (row) =>
        typeof row?.newDocumentState?.id === "string" &&
        typeof row.newDocumentState._deleted === "boolean",
    )
  );
}

// One instance per sync key, so every write for a key runs one at a time.
export class SyncRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS docs (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      seq INTEGER NOT NULL,
      PRIMARY KEY (collection, id)
    )`);
    ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS docs_by_seq ON docs (collection, seq)");
  }

  async fetch(request: Request): Promise<Response> {
    const [, , , , collection, action] = new URL(request.url).pathname.split("/");

    if (collection === undefined && request.method === "GET") {
      return Response.json({ count: this.count() });
    }

    if (collection === "ws" && action === undefined) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (COLLECTIONS.has(collection) && request.method === "POST") {
      const body: unknown = await request.json().catch(() => null);
      if (action === "pull") {
        const { checkpoint, batchSize } = (body ?? {}) as {
          checkpoint?: Checkpoint;
          batchSize?: number;
        };
        return Response.json(this.pull(collection, checkpoint ?? null, batchSize ?? 100));
      }
      if (action === "push") {
        if (!isPushRows(body)) return new Response("Invalid push body", { status: 400 });
        return Response.json(this.push(collection, body));
      }
    }

    return new Response("Not found", { status: 404 });
  }

  private count(): number {
    return this.ctx.storage.sql
      .exec<{ n: number }>(
        "SELECT COUNT(*) AS n FROM docs WHERE json_extract(data, '$._deleted') = 0",
      )
      .one().n;
  }

  private pull(collection: string, checkpoint: Checkpoint, batchSize: number) {
    const rows = this.ctx.storage.sql
      .exec<{ data: string; seq: number }>(
        "SELECT data, seq FROM docs WHERE collection = ? AND seq > ? ORDER BY seq LIMIT ?",
        collection,
        checkpoint?.seq ?? 0,
        Math.min(batchSize, 500),
      )
      .toArray();
    const last = rows.at(-1);
    return {
      documents: rows.map((row) => JSON.parse(row.data) as Doc),
      checkpoint: last ? { seq: last.seq } : checkpoint,
    };
  }

  // Returns the stored doc for every row whose assumed state is stale (RxDB's conflict contract).
  private push(collection: string, rows: PushRow[]): Doc[] {
    const sql = this.ctx.storage.sql;
    const conflicts: Doc[] = [];
    let seq = sql.exec<{ seq: number }>("SELECT COALESCE(MAX(seq), 0) AS seq FROM docs").one().seq;

    for (const { assumedMasterState, newDocumentState } of rows) {
      const stored = sql
        .exec<{ data: string }>(
          "SELECT data FROM docs WHERE collection = ? AND id = ?",
          collection,
          newDocumentState.id,
        )
        .toArray()[0];
      const master = stored ? (JSON.parse(stored.data) as Doc) : undefined;
      if (master && !sameDoc(master, assumedMasterState)) {
        conflicts.push(master);
        continue;
      }
      seq += 1;
      sql.exec(
        `INSERT INTO docs (collection, id, data, seq) VALUES (?, ?, ?, ?)
         ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq`,
        collection,
        newDocumentState.id,
        JSON.stringify(newDocumentState),
        seq,
      );
    }

    if (conflicts.length < rows.length) {
      for (const ws of this.ctx.getWebSockets()) ws.send(collection);
    }
    return conflicts;
  }
}
