import { afterEach, describe, expect, it, vi } from "vitest";

import { dashboardShortcutDigit, isDialogOpen, isMac, shortcutLabel } from "./keyboard";

describe("isMac", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true on a Mac platform", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel", userAgent: "" });
    expect(isMac()).toBe(true);
  });

  it("returns false on a non-Mac platform", () => {
    vi.stubGlobal("navigator", { platform: "Win32", userAgent: "" });
    expect(isMac()).toBe(false);
  });
});

describe("shortcutLabel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the option glyph on macOS", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel", userAgent: "" });
    expect(shortcutLabel("3")).toBe("⌥3");
  });

  it("uses Alt+ on other platforms", () => {
    vi.stubGlobal("navigator", { platform: "Win32", userAgent: "" });
    expect(shortcutLabel("3")).toBe("Alt+3");
  });
});

describe("dashboardShortcutDigit", () => {
  it("returns 1-9 for the first nine positions", () => {
    expect(dashboardShortcutDigit(0)).toBe(1);
    expect(dashboardShortcutDigit(8)).toBe(9);
  });

  it("returns 0 for the tenth position", () => {
    expect(dashboardShortcutDigit(9)).toBe(0);
  });
});

describe("isDialogOpen", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns false when no dialog is present", () => {
    expect(isDialogOpen()).toBe(false);
  });

  it('returns true when a [role="dialog"] element is present', () => {
    const div = document.createElement("div");
    div.setAttribute("role", "dialog");
    document.body.appendChild(div);
    expect(isDialogOpen()).toBe(true);
  });

  it('returns true when a [role="alertdialog"] element is present', () => {
    const div = document.createElement("div");
    div.setAttribute("role", "alertdialog");
    document.body.appendChild(div);
    expect(isDialogOpen()).toBe(true);
  });
});
