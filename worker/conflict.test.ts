import { describe, expect, it } from "vitest";

import { isSyncKey, sameDoc } from "./conflict";

describe("isSyncKey", () => {
  it("accepts a lowercase UUID", () => {
    expect(isSyncKey("3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSyncKey(undefined)).toBe(false);
    expect(isSyncKey("")).toBe(false);
    expect(isSyncKey("not-a-key")).toBe(false);
    expect(isSyncKey("3C2B6E2A-2F0E-4B8B-9A7B-9D6A2B3C4D5E")).toBe(false);
    expect(isSyncKey("3c2b6e2a-2f0e-4b8b-9a7b-9d6a2b3c4d5e/..")).toBe(false);
  });
});

describe("sameDoc", () => {
  it("ignores key order, including nested objects", () => {
    expect(
      sameDoc({ id: "a", order: 1, x: { p: 1, q: 2 } }, { x: { q: 2, p: 1 }, order: 1, id: "a" }),
    ).toBe(true);
  });

  it("treats an undefined field as absent", () => {
    expect(sameDoc({ id: "a", backgroundImageUrl: undefined }, { id: "a" })).toBe(true);
  });

  it("detects a changed value or a missing field", () => {
    expect(sameDoc({ id: "a", order: 1 }, { id: "a", order: 2 })).toBe(false);
    expect(sameDoc({ id: "a", title: "" }, { id: "a" })).toBe(false);
    expect(sameDoc({ id: "a", _deleted: false }, { id: "a", _deleted: true })).toBe(false);
  });
});
