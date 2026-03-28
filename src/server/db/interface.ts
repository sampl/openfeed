import type { FeedItem, NewFeedItem, SourceResult, PaginatedItemsResponse } from "../../connectors/types.js";

export type { SourceResult };

export interface NewDbItem extends NewFeedItem {
  readonly id: string;
  readonly createdAt: Date;
}

export interface NewRun {
  readonly id: string;
  readonly triggeredBy: "schedule" | "manual";
  readonly startedAt: Date;
}

export interface Run {
  readonly id: string;
  readonly triggeredBy: "schedule" | "manual";
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly status: "running" | "success" | "error";
  readonly errorMessage?: string;
  readonly sourceResults: readonly SourceResult[];
}

export interface NewTimeSession {
  readonly id: string;
  readonly feedName?: string;
  readonly date: string; // YYYY-MM-DD in user's local time
  readonly durationMs: number;
  readonly createdAt: Date;
}

export interface TimeUsage {
  readonly byFeed: Record<string, number>; // ms per feed name
  readonly total: number; // ms across all feeds
}

// PaginatedItems is the DB-layer shape; the API serializes it to PaginatedItemsResponse.
export interface PaginatedItems {
  items: FeedItem[];
  hasMore: boolean;
  total: number;
}

export type { PaginatedItemsResponse };

export interface DbInterface {
  // Items
  getItems: (status: "unread" | "archived" | "read-later", feedName?: string, limit?: number, offset?: number) => PaginatedItems;
  upsertItems: (items: NewDbItem[]) => number; // returns count inserted
  replaceSourceItems: (sourceUrl: string, items: NewDbItem[]) => number;
  updateItemStatus: (id: string, status: "unread" | "archived" | "read-later") => void;
  expireItems: (sourceUrl: string, olderThan: Date) => number; // returns count expired

  // Runs
  createRun: (run: NewRun) => string; // returns run id
  updateRun: (id: string, update: Partial<Pick<Run, "status" | "completedAt" | "errorMessage" | "sourceResults">>) => void;
  getRuns: (limit?: number) => Run[];

  // Time tracking
  recordTimeSession: (session: NewTimeSession) => void;
  getTimeUsage: (date: string) => TimeUsage;
}
