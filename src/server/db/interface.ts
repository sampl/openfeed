import type { FeedItem, PluginFeedItem, ItemStatus, SourceResult, PaginatedItemsResponse } from "../../connectors/types.js";

export type { SourceResult };

export interface NewDbItem extends PluginFeedItem {
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

  /** Returns a paginated, status-filtered list of items, optionally scoped to a feed. */
  getItems: (status: ItemStatus, feedName?: string, limit?: number, offset?: number) => PaginatedItems;
  /** Inserts new items, skipping duplicates by URL. Returns the count actually inserted. */
  upsertItems: (items: NewDbItem[]) => number;
  /** Updates a single item's status. No-ops silently if the id does not exist. */
  updateItemStatus: (id: string, status: ItemStatus) => void;
  /** Marks items for `sourceUrl` that were published before `olderThan` as "expired". Returns the count expired. */
  expireItems: (sourceUrl: string, olderThan: Date) => number;

  // Runs

  /** Persists a new run record in "running" state and returns its id. */
  createRun: (run: NewRun) => string;
  /** Applies a partial update to an existing run (e.g. to mark it completed or errored). */
  updateRun: (id: string, update: Partial<Pick<Run, "status" | "completedAt" | "errorMessage" | "sourceResults">>) => void;
  /** Returns the most recent runs, newest first, up to `limit`. */
  getRuns: (limit?: number) => Run[];

  // Time tracking

  /** Persists a reading session duration for a given feed and date. */
  recordTimeSession: (session: NewTimeSession) => void;
  /** Returns aggregated reading time in milliseconds for the given YYYY-MM-DD date. */
  getTimeUsage: (date: string) => TimeUsage;
}
