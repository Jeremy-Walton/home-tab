import { createContext } from "react";

import type { SyncStatus } from "../storage/sync";
import type { Dashboard, ExportedState, Link } from "../types";

export interface ImportSummary {
  dashboards: number;
  links: number;
}

export interface AppStateValue {
  ready: boolean;
  dashboards: Dashboard[];
  links: Link[];
  activeDashboardId: string | null;
  setActiveDashboardId: (id: string) => void;
  addDashboard: (name: string) => Promise<void>;
  updateDashboard: (
    id: string,
    fields: Partial<Pick<Dashboard, "name" | "backgroundImageUrl">>,
  ) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  addLink: (dashboardId: string) => Promise<string | null>;
  updateLink: (
    id: string,
    fields: Partial<Pick<Link, "title" | "url" | "backgroundImageUrl">>,
  ) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  reorderLinks: (dashboardId: string, orderedIds: string[]) => Promise<void>;
  moveLinkToDashboard: (linkId: string, targetDashboardId: string) => Promise<void>;
  exportState: () => ExportedState;
  importState: (data: unknown) => Promise<ImportSummary>;
  syncKey: string | null;
  /** null when not syncing. */
  syncStatus: SyncStatus | null;
  createSyncKey: () => void;
  /** Resolves to the normalized key; rejects with a user-facing message. */
  checkSyncKey: (rawKey: string) => Promise<string>;
  /** Replaces this browser's data with the key's and reloads. */
  joinSyncKey: (key: string) => void;
  stopSync: () => Promise<void>;
}

export const AppStateContext = createContext<AppStateValue | null>(null);
