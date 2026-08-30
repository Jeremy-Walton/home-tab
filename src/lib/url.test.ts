import { describe, expect, it } from "vitest";
import { isSafeHref, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("prepends https:// when no scheme is present", () => {
    expect(normalizeUrl("github.com")).toBe("https://github.com");
  });

  it("leaves an existing https:// scheme untouched", () => {
    expect(normalizeUrl("https://github.com")).toBe("https://github.com");
  });

  it("leaves an existing http:// scheme untouched", () => {
    expect(normalizeUrl("http://github.com")).toBe("http://github.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeUrl("  github.com  ")).toBe("https://github.com");
  });

  it("returns an empty string unchanged", () => {
    expect(normalizeUrl("")).toBe("");
  });
});

describe("isSafeHref", () => {
  it("accepts an https:// URL", () => {
    expect(isSafeHref("https://example.com")).toBe(true);
  });

  it("accepts an http:// URL", () => {
    expect(isSafeHref("http://example.com")).toBe(true);
  });

  it("rejects a javascript: URL", () => {
    expect(isSafeHref("javascript:void(0)")).toBe(false);
  });

  it("rejects a data: URL", () => {
    expect(isSafeHref("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects an unparseable string", () => {
    expect(isSafeHref("not a url")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeHref("")).toBe(false);
  });
});
