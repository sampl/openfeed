import Database from "better-sqlite3";
import type { AS2ActivityType } from "../../connectors/types.js";
import type {
  DbInterface,
  DbObject,
  NewDbObject,
  NewActivity,
  NewRun,
  NewTimeSession,
  PaginatedObjects,
  Run,
  SourceResult,
  TimeUsage,
} from "./interface.js";
import { runMigrations } from "./migrations.js";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

const rowToDbObject = (row: Record<string, unknown>): DbObject => {
  const obj: DbObject = {
    id: row.id as string,
    type: row.type as DbObject["type"],
    url: row.url as string,
    sourceName: row.source_name as string,
    sourceUrl: row.source_url as string,
    feedName: row.feed_name as string | undefined,
    createdAt: new Date(row.created_at as number),
  };

  if (row.name != null) (obj as unknown as Record<string, unknown>).name = row.name as string;
  if (row.summary != null) (obj as unknown as Record<string, unknown>).summary = row.summary as string;
  if (row.content != null) (obj as unknown as Record<string, unknown>).content = row.content as string;
  if (row.media_type != null) (obj as unknown as Record<string, unknown>).mediaType = row.media_type as string;
  if (row.published != null) (obj as unknown as Record<string, unknown>).published = new Date(row.published as number);

  if (row.attachment != null) {
    (obj as unknown as Record<string, unknown>).attachment = JSON.parse(row.attachment as string);
  }
  if (row.extras != null) {
    (obj as unknown as Record<string, unknown>).extras = JSON.parse(row.extras as string);
  }

  return obj;
};

const rowToRun = (row: Record<string, unknown>): Run => ({
  id: row.id as string,
  triggeredBy: row.triggered_by as "schedule" | "manual",
  startedAt: new Date(row.started_at as number),
  completedAt: row.completed_at != null ? new Date(row.completed_at as number) : undefined,
  status: row.status as "running" | "success" | "error",
  errorMessage: row.error_message as string | undefined,
  sourceResults: row.source_results != null
    ? (JSON.parse(row.source_results as string) as SourceResult[])
    : [],
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createSqliteDb = (dbPath: string): DbInterface => {
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  // -------------------------------------------------------------------------
  // Objects
  // -------------------------------------------------------------------------

  const upsertObjects = (objects: NewDbObject[]): number => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO objects
        (id, type, name, summary, content, media_type, url, attachment, extras,
         published, source_name, source_url, feed_name, created_at)
      VALUES
        (@id, @type, @name, @summary, @content, @mediaType, @url, @attachment, @extras,
         @published, @sourceName, @sourceUrl, @feedName, @createdAt)
    `);

    const insertActivity = db.prepare(`
      INSERT OR IGNORE INTO activities (id, type, object_id, published, created_at)
      VALUES (@id, 'Create', @objectId, @published, @createdAt)
    `);

    const insertMany = db.transaction((rows: NewDbObject[]) => {
      let inserted = 0;
      for (const obj of rows) {
        const result = insert.run({
          id: obj.id,
          type: obj.type,
          name: obj.name ?? null,
          summary: obj.summary ?? null,
          content: obj.content ?? null,
          mediaType: obj.mediaType ?? null,
          url: obj.url,
          attachment: obj.attachment != null ? JSON.stringify(obj.attachment) : null,
          extras: obj.extras != null ? JSON.stringify(obj.extras) : null,
          published: obj.published != null ? obj.published.getTime() : null,
          sourceName: obj.sourceName,
          sourceUrl: obj.sourceUrl,
          feedName: obj.feedName ?? null,
          createdAt: obj.createdAt.getTime(),
        });
        if (result.changes > 0) {
          // New object inserted — create the corresponding Create activity
          const now = Date.now();
          insertActivity.run({
            id: randomUUID(),
            objectId: obj.id,
            published: obj.published != null ? obj.published.getTime() : now,
            createdAt: now,
          });
          inserted++;
        }
      }
      return inserted;
    });

    return insertMany(objects) as number;
  };

  // Objects with a Create activity and no Read activity — "unread"
  const getUnreadObjects = (
    feedName?: string,
    limit = 30,
    offset = 0,
  ): PaginatedObjects => {
    const feedFilter = feedName != null ? "AND o.feed_name = ?" : "";
    const countSql = `
      SELECT COUNT(*) as count FROM objects o
      INNER JOIN activities ca ON ca.object_id = o.id AND ca.type = 'Create'
      LEFT  JOIN activities ra ON ra.object_id = o.id AND ra.type = 'Read'
      WHERE ra.id IS NULL ${feedFilter}
    `;
    const rowsSql = `
      SELECT o.* FROM objects o
      INNER JOIN activities ca ON ca.object_id = o.id AND ca.type = 'Create'
      LEFT  JOIN activities ra ON ra.object_id = o.id AND ra.type = 'Read'
      WHERE ra.id IS NULL ${feedFilter}
      ORDER BY o.published DESC LIMIT ? OFFSET ?
    `;

    const args = feedName != null ? [feedName] : [];
    const total = (db.prepare(countSql).get(...args) as { count: number }).count;
    const rows = db.prepare(rowsSql).all(...args, limit, offset) as Record<string, unknown>[];
    const objects = rows.map(rowToDbObject);
    return { objects, hasMore: offset + objects.length < total, total };
  };

  // Objects with an Add activity and no Read activity — "saved for later"
  const getSavedObjects = (limit = 30, offset = 0): PaginatedObjects => {
    const total = (db.prepare(`
      SELECT COUNT(*) as count FROM objects o
      INNER JOIN activities aa ON aa.object_id = o.id AND aa.type = 'Add'
      LEFT  JOIN activities ra ON ra.object_id = o.id AND ra.type = 'Read'
      WHERE ra.id IS NULL
    `).get() as { count: number }).count;

    const rows = db.prepare(`
      SELECT o.* FROM objects o
      INNER JOIN activities aa ON aa.object_id = o.id AND aa.type = 'Add'
      LEFT  JOIN activities ra ON ra.object_id = o.id AND ra.type = 'Read'
      WHERE ra.id IS NULL
      ORDER BY aa.published DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Record<string, unknown>[];

    const objects = rows.map(rowToDbObject);
    return { objects, hasMore: offset + objects.length < total, total };
  };

  // All objects regardless of activity state
  const getAllObjects = (
    feedName?: string,
    limit = 30,
    offset = 0,
  ): PaginatedObjects => {
    const feedFilter = feedName != null ? "WHERE o.feed_name = ?" : "";
    const countSql = `SELECT COUNT(*) as count FROM objects o ${feedFilter}`;
    const rowsSql = `SELECT * FROM objects o ${feedFilter} ORDER BY published DESC LIMIT ? OFFSET ?`;

    const args = feedName != null ? [feedName] : [];
    const total = (db.prepare(countSql).get(...args) as { count: number }).count;
    const rows = db.prepare(rowsSql).all(...args, limit, offset) as Record<string, unknown>[];
    const objects = rows.map(rowToDbObject);
    return { objects, hasMore: offset + objects.length < total, total };
  };

  // Expire old objects by creating Read activities for them
  const expireObjects = (sourceUrl: string, olderThan: Date): number => {
    const candidates = db.prepare(`
      SELECT o.id FROM objects o
      INNER JOIN activities ca ON ca.object_id = o.id AND ca.type = 'Create'
      LEFT  JOIN activities ra ON ra.object_id = o.id AND ra.type = 'Read'
      WHERE ra.id IS NULL
        AND o.source_url = ?
        AND o.created_at < ?
    `).all(sourceUrl, olderThan.getTime()) as { id: string }[];

    if (candidates.length === 0) return 0;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO activities (id, type, object_id, published, created_at)
      VALUES (?, 'Read', ?, ?, ?)
    `);

    const now = Date.now();
    const bulkExpire = db.transaction(() => {
      for (const row of candidates) {
        insert.run(randomUUID(), row.id, now, now);
      }
      return candidates.length;
    });

    return bulkExpire() as number;
  };

  // -------------------------------------------------------------------------
  // Activities
  // -------------------------------------------------------------------------

  const createActivity = (activity: NewActivity): string => {
    db.prepare(`
      INSERT INTO activities (id, type, object_id, target, published, created_at)
      VALUES (@id, @type, @objectId, @target, @published, @createdAt)
    `).run({
      id: activity.id,
      type: activity.type,
      objectId: activity.objectId,
      target: activity.target != null ? JSON.stringify(activity.target) : null,
      published: activity.published.getTime(),
      createdAt: activity.createdAt.getTime(),
    });
    return activity.id;
  };

  const hasActivity = (objectId: string, type: AS2ActivityType): boolean => {
    const row = db.prepare(
      "SELECT id FROM activities WHERE object_id = ? AND type = ? LIMIT 1"
    ).get(objectId, type);
    return row != null;
  };

  const objectExists = (id: string): boolean => {
    const row = db.prepare("SELECT id FROM objects WHERE id = ? LIMIT 1").get(id);
    return row != null;
  };

  // -------------------------------------------------------------------------
  // Runs
  // -------------------------------------------------------------------------

  const createRun = (run: NewRun): string => {
    db.prepare(`
      INSERT INTO runs (id, triggered_by, started_at, status)
      VALUES (@id, @triggeredBy, @startedAt, 'running')
    `).run({
      id: run.id,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt.getTime(),
    });
    return run.id;
  };

  const updateRun = (
    id: string,
    update: Partial<Pick<Run, "status" | "completedAt" | "errorMessage" | "sourceResults">>
  ): void => {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (update.status !== undefined) {
      fields.push("status = @status");
      values.status = update.status;
    }
    if (update.completedAt !== undefined) {
      fields.push("completed_at = @completedAt");
      values.completedAt = update.completedAt.getTime();
    }
    if (update.errorMessage !== undefined) {
      fields.push("error_message = @errorMessage");
      values.errorMessage = update.errorMessage;
    }
    if (update.sourceResults !== undefined) {
      fields.push("source_results = @sourceResults");
      values.sourceResults = JSON.stringify(update.sourceResults);
    }

    if (fields.length === 0) return;
    db.prepare(`UPDATE runs SET ${fields.join(", ")} WHERE id = @id`).run(values);
  };

  const getRuns = (limit = 50): Run[] => {
    const rows = db
      .prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(rowToRun);
  };

  // -------------------------------------------------------------------------
  // Time tracking
  // -------------------------------------------------------------------------

  const recordTimeSession = (session: NewTimeSession): void => {
    db.prepare(`
      INSERT INTO time_sessions (id, feed_name, date, duration_ms, created_at)
      VALUES (@id, @feedName, @date, @durationMs, @createdAt)
    `).run({
      id: session.id,
      feedName: session.feedName ?? null,
      date: session.date,
      durationMs: session.durationMs,
      createdAt: session.createdAt.getTime(),
    });
  };

  const getTimeUsage = (date: string): TimeUsage => {
    const rows = db
      .prepare("SELECT feed_name, SUM(duration_ms) as total_ms FROM time_sessions WHERE date = ? GROUP BY feed_name")
      .all(date) as { feed_name: string | null; total_ms: number }[];

    const byFeed: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const ms = row.total_ms;
      total += ms;
      if (row.feed_name != null) {
        byFeed[row.feed_name] = (byFeed[row.feed_name] ?? 0) + ms;
      }
    }

    return { byFeed, total };
  };

  // -------------------------------------------------------------------------
  // Versioning
  // -------------------------------------------------------------------------

  const getDbVersion = (): number => {
    const row = db.prepare("SELECT MAX(version) as v FROM schema_migrations").get() as { v: number | null };
    return row.v ?? 0;
  };

  return {
    upsertObjects,
    getUnreadObjects,
    getSavedObjects,
    getAllObjects,
    expireObjects,
    createActivity,
    hasActivity,
    objectExists,
    createRun,
    updateRun,
    getRuns,
    recordTimeSession,
    getTimeUsage,
    getDbVersion,
  };
};
