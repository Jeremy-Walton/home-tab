import { isSyncKey } from "./conflict";

export { SyncRoom } from "./SyncRoom";

export default {
  async fetch(request, env) {
    const [, api, sync, key] = new URL(request.url).pathname.split("/");
    if (api !== "api" || sync !== "sync" || !isSyncKey(key)) {
      return new Response("Not found", { status: 404 });
    }
    return env.SYNC_ROOM.getByName(key).fetch(request);
  },
} satisfies ExportedHandler<Env>;
