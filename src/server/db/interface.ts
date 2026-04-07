import type {
  AS2Object,
  AS2ObjectType,
  AS2ActivityType,
  AS2Link,
  SourceResult,
} from "../../connectors/types.js";

export type { SourceResult };

// ---------------------------------------------------------------------------
// Object types
// ---------------------------------------------------------------------------

/** Shape for inserting a new object — id and provenance are framework-assigned. */
export interface NewDbObject {
  readonly id: string;
  readonly type: AS2ObjectType;
  readonly name?: string;
  readonly summary?: string;
  readonly content?: string;
  readonly mediaType?: string;
  readonly url: string;
  readonly attachment?: AS2Link[];
  /** Any extra AS2 properties (inReplyTo, tag, context, …) stored as JSON. */
  readonly extras?: Record<string, unknown>;
  readonly published?: Date;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly feedName?: string;
  readonly createdAt: Date;
}

/** DB-layer object before icon injection. */
export interface DbObject extends Omit<NewDbObject, "published"> {
  readonly published?: Date;
}

export interface PaginatedObjects {
  readonly objects: DbObject[];
  readonly hasMore: boolean;
  readonly total: number;
}

// ---------------------------------------------------------------------------
// Activity types
// ---------------------------------------------------------------------------

export interface NewActivity {
  readonly id: string;
  readonly type: AS2ActivityType;
  readonly objectId: string;
  readonly target?: { type: "Collection"; name: "read-later" };
  readonly published: Date;
  readonly createdAt: Date;
}

// ---------------------------------------------------------------------------
// Run types (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Time-tracking types (unchanged)
// ---------------------------------------------------------------------------

export interface NewTimeSession {
  readonly id: string;
  readonly feedName?: string;
  readonly date: string; // YYYY-MM-DD
  readonly durationMs: number;
  readonly createdAt: Date;
}

export interface TimeUsage {
  readonly byFeed: Record<string, number>; // ms per feed
  readonly total: number;
}

// ---------------------------------------------------------------------------
// DB interface
// ---------------------------------------------------------------------------

export interface DbInterface {
  // Objects

  /** Inserts new objects, skipping duplicates by URL. Returns the count inserted. */
  upsertObjects: (objects: NewDbObject[]) => number;

  /**
   * Returns objects that have a Create activity but no Read activity —
   * i.e. "unread" items. Optionally scoped to a feedName.
   */
  getUnreadObjects: (feedName?: string, limit?: number, offset?: number) => PaginatedObjects;

  /**
   * Returns objects that have an Add activity but no Read activity —
   * i.e. items saved for later.
   */
  getSavedObjects: (limit?: number, offset?: number) => PaginatedObjects;

  /**
   * Returns all objects regardless of activity state, ordered by published DESC.
   */
  getAllObjects: (feedName?: string, limit?: number, offset?: number) => PaginatedObjects;

  /**
   * Creates Read activities for objects from sourceUrl created before olderThan
   * that have no existing Read activity. Returns the count expired.
   */
  expireObjects: (sourceUrl: string, olderThan: Date) => number;

  // Activities

  /** Persists a new activity. Returns the new activity id. */
  createActivity: (activity: NewActivity) => string;

  /** Returns true if an activity of the given type exists for objectId. */
  hasActivity: (objectId: string, type: AS2ActivityType) => boolean;

  /** Returns true if an object with the given id exists. */
  objectExists: (id: string) => boolean;

  // Runs

  /** Persists a new run record in "running" state and returns its id. */
  createRun: (run: NewRun) => string;
  /** Applies a partial update to an existing run. */
  updateRun: (id: string, update: Partial<Pick<Run, "status" | "completedAt" | "errorMessage" | "sourceResults">>) => void;
  /** Returns the most recent runs, newest first, up to limit. */
  getRuns: (limit?: number) => Run[];

  // Time tracking

  /** Persists a reading session duration for a given feed and date. */
  recordTimeSession: (session: NewTimeSession) => void;
  /** Returns aggregated reading time in milliseconds for the given YYYY-MM-DD date. */
  getTimeUsage: (date: string) => TimeUsage;

  // Versioning

  /** Returns the current database schema version. */
  getDbVersion: () => number;
}

// ---------------------------------------------------------------------------
// Helper — converts a DbObject to the AS2Object shape for API responses.
// sourceIconUrl is injected separately by the API route.
// ---------------------------------------------------------------------------

export const dbObjectToAS2 = (obj: DbObject): Omit<AS2Object, "sourceIconUrl"> => {
  const base: Omit<AS2Object, "sourceIconUrl"> = {
    id: obj.id,
    type: obj.type,
    url: obj.url,
    sourceName: obj.sourceName,
    sourceUrl: obj.sourceUrl,
  };

  if (obj.name != null) (base as Record<string, unknown>).name = obj.name;
  if (obj.summary != null) (base as Record<string, unknown>).summary = obj.summary;
  if (obj.content != null) (base as Record<string, unknown>).content = obj.content;
  if (obj.mediaType != null) (base as Record<string, unknown>).mediaType = obj.mediaType;
  if (obj.attachment != null) (base as Record<string, unknown>).attachment = obj.attachment;
  if (obj.published != null) (base as Record<string, unknown>).published = obj.published.toISOString();
  if (obj.feedName != null) (base as Record<string, unknown>).feedName = obj.feedName;

  // Spread any extra AS2 properties (inReplyTo, tag, context, …)
  if (obj.extras != null) {
    Object.assign(base, obj.extras);
  }

  return base;
};
