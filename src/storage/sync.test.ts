import { afterEach, describe, expect, it, vi } from "vitest";

import { checkSyncKey } from "./sync";

const KEY = "3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e";

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("checkSyncKey", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes the key and resolves when the key has data", async () => {
    const fetchMock = stubFetch(async () => Response.json({ count: 3 }));
    await expect(checkSyncKey(`  ${KEY.toUpperCase()} `)).resolves.toBe(KEY);
    expect(fetchMock).toHaveBeenCalledWith(`/api/sync/${KEY}`);
  });

  it("rejects a key with no data, so joining can't wipe this browser for nothing", async () => {
    stubFetch(async () => Response.json({ count: 0 }));
    await expect(checkSyncKey(KEY)).rejects.toThrow("No synced data found for that key.");
  });

  it("rejects a key the server refuses (malformed)", async () => {
    stubFetch(async () => new Response("Not found", { status: 404 }));
    await expect(checkSyncKey("typo")).rejects.toThrow("No synced data found for that key.");
  });

  it("reports a network failure separately", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(checkSyncKey(KEY)).rejects.toThrow("Could not reach the sync server.");
  });
});
