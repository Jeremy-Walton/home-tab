import { describe, expect, it } from "vitest";

import type { ExportedState, LegacyState } from "../types";
import {
  CURRENT_EXPORT_VERSION,
  isExportedState,
  isLegacyState,
  mapLegacyState,
  sanitizeExportedState,
  serializeState,
} from "./importExport";

describe("isLegacyState", () => {
  it("recognizes the old localStorage.state shape", () => {
    const legacy: LegacyState = { links: [], backgroundUrl: "" };
    expect(isLegacyState(legacy)).toBe(true);
  });

  it("does not classify the new exported shape as legacy", () => {
    expect(isLegacyState({ dashboards: [], links: [], activeDashboardId: null })).toBe(false);
  });
});

describe("serializeState", () => {
  it("stamps the current export version", () => {
    const state = serializeState([], [], null);
    expect(state.version).toBe(CURRENT_EXPORT_VERSION);
    expect(state.version).toBe(1);
  });
});

describe("isExportedState", () => {
  it("recognizes the new exported shape", () => {
    expect(isExportedState({ dashboards: [], links: [], activeDashboardId: null })).toBe(true);
  });

  it("accepts a valid file with version 1", () => {
    expect(
      isExportedState({ version: 1, dashboards: [], links: [], activeDashboardId: null }),
    ).toBe(true);
  });

  it("rejects a non-number version", () => {
    expect(
      isExportedState({ version: "1", dashboards: [], links: [], activeDashboardId: null }),
    ).toBe(false);
  });

  it("rejects a version newer than the current export version", () => {
    expect(
      isExportedState({ version: 2, dashboards: [], links: [], activeDashboardId: null }),
    ).toBe(false);
  });

  it("rejects the legacy shape", () => {
    expect(isExportedState({ links: [], backgroundUrl: "" })).toBe(false);
  });

  it("rejects non-array dashboards/links", () => {
    expect(isExportedState({ dashboards: 1, links: 2 })).toBe(false);
  });

  it("rejects a link missing url", () => {
    expect(
      isExportedState({
        dashboards: [{ id: "d1", name: "D1", order: 0, createdAt: 1 }],
        links: [{ id: "l1", dashboardId: "d1", order: 0, title: "A" }],
        activeDashboardId: null,
      }),
    ).toBe(false);
  });

  it("rejects a non-string, non-null activeDashboardId", () => {
    expect(
      isExportedState({
        dashboards: [],
        links: [{ id: "l1", dashboardId: "d1", order: 0, title: "A", url: "https://a.com" }],
        activeDashboardId: 42,
      }),
    ).toBe(false);
  });

  it("accepts a valid file without activeDashboardId", () => {
    expect(
      isExportedState({
        dashboards: [{ id: "d1", name: "D1", order: 0, createdAt: 1 }],
        links: [],
      }),
    ).toBe(true);
  });
});

describe("sanitizeExportedState", () => {
  it("prepends https:// to a scheme-less link url", () => {
    const state: ExportedState = {
      dashboards: [],
      links: [{ id: "l1", dashboardId: "d1", order: 0, title: "A", url: "example.com" }],
      activeDashboardId: null,
    };
    const clean = sanitizeExportedState(state);
    expect(clean.links[0].url).toBe("https://example.com");
  });

  it("drops unknown extra fields", () => {
    const state = {
      dashboards: [],
      links: [
        {
          id: "l1",
          dashboardId: "d1",
          order: 0,
          title: "A",
          url: "https://a.com",
          extra: "nope",
        },
      ],
      activeDashboardId: null,
    } as unknown as ExportedState;
    const clean = sanitizeExportedState(state);
    expect(clean.links[0]).not.toHaveProperty("extra");
  });

  it("treats a non-string activeDashboardId as null", () => {
    const state = {
      dashboards: [],
      links: [],
      activeDashboardId: undefined,
    } as unknown as ExportedState;
    expect(sanitizeExportedState(state).activeDashboardId).toBeNull();
  });

  it("strips the version field — it is a file-format concern, not app state", () => {
    const state: ExportedState = {
      version: 1,
      dashboards: [],
      links: [],
      activeDashboardId: null,
    };
    expect(sanitizeExportedState(state)).not.toHaveProperty("version");
  });
});

describe("mapLegacyState", () => {
  it("maps the legacy single-dashboard shape onto a new dashboard + links", () => {
    const legacy: LegacyState = {
      backgroundUrl: "https://example.com/bg.jpg",
      links: [
        {
          key: 1,
          id: 0,
          label: "GitHub",
          url: "github.com",
          image: "https://example.com/gh.png",
          color: "#fff",
          isDisabled: false,
        },
      ],
    };

    const { dashboard, links } = mapLegacyState(legacy);

    expect(dashboard.name).toBe("Imported");
    expect(dashboard.backgroundImageUrl).toBe("https://example.com/bg.jpg");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      dashboardId: dashboard.id,
      order: 0,
      title: "GitHub",
      url: "https://github.com",
      backgroundImageUrl: "https://example.com/gh.png",
    });
    expect(links[0]).not.toHaveProperty("backgroundColor");
  });

  it("normalizes a scheme-less image field", () => {
    const legacy: LegacyState = {
      links: [{ label: "GitHub", url: "github.com", image: "example.com/gh.png" }],
    };

    const { links } = mapLegacyState(legacy);

    expect(links[0].backgroundImageUrl).toBe("https://example.com/gh.png");
  });
});
