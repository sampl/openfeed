import Database from "better-sqlite3";
import type { FeedItem, FeedItemRenderData } from "../../connectors/types.js";
import type { DbInterface, NewDbItem, NewRun, NewTimeSession, PaginatedItems, Run, SourceResult, TimeUsage } from "./interface.js";

const createSchema = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL UNIQUE,
      published_at INTEGER,
      render_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_status_published ON items (status, published_at DESC);

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      triggered_by TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL,
      error_message TEXT,
      source_results TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_started ON runs (started_at DESC);
  `);

  // Add feed_name column to existing databases that predate this field
  try {
    db.exec("ALTER TABLE items ADD COLUMN feed_name TEXT");
  } catch {
    // Column already exists — safe to ignore
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id TEXT PRIMARY KEY,
      feed_name TEXT,
      date TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_time_sessions_date ON time_sessions (date, feed_name);
  `);
};

const rowToFeedItem = (row: Record<string, unknown>): FeedItem => ({
  id: row.id as string,
  sourceName: row.source_name as string,
  sourceUrl: row.source_url as string,
  feedName: row.feed_name as string | undefined,
  title: row.title as string,
  description: row.description as string | undefined,
  url: row.url as string,
  publishedAt: new Date(row.published_at as number),
  renderData: JSON.parse(row.render_data as string) as FeedItemRenderData,
  status: row.status as "unread" | "archived" | "read-later",
  createdAt: new Date(row.created_at as number),
});

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

export const createSqliteDb = (dbPath: string): DbInterface => {
  const db = new Database(dbPath);

  // WAL mode improves concurrent read/write performance
  db.pragma("journal_mode = WAL");

  createSchema(db);

  const getItems = (
    status: "unread" | "archived" | "read-later",
    feedName?: string,
    limit = 30,
    offset = 0,
  ): PaginatedItems => {
    if (feedName != null) {
      const total = (
        db.prepare("SELECT COUNT(*) as count FROM items WHERE status = ? AND feed_name = ?")
          .get(status, feedName) as { count: number }
      ).count;
      const rows = db
        .prepare("SELECT * FROM items WHERE status = ? AND feed_name = ? ORDER BY published_at DESC LIMIT ? OFFSET ?")
        .all(status, feedName, limit, offset) as Record<string, unknown>[];
      return { items: rows.map(rowToFeedItem), hasMore: offset + rows.length < total, total };
    }
    const total = (
      db.prepare("SELECT COUNT(*) as count FROM items WHERE status = ?")
        .get(status) as { count: number }
    ).count;
    const rows = db
      .prepare("SELECT * FROM items WHERE status = ? ORDER BY published_at DESC LIMIT ? OFFSET ?")
      .all(status, limit, offset) as Record<string, unknown>[];
    return { items: rows.map(rowToFeedItem), hasMore: offset + rows.length < total, total };
  };

  const upsertItems = (items: NewDbItem[]): number => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO items
        (id, source_name, source_url, feed_name, title, description, url, published_at, render_data, status, created_at)
      VALUES
        (@id, @sourceName, @sourceUrl, @feedName, @title, @description, @url, @publishedAt, @renderData, 'unread', @createdAt)
    `);

    const insertMany = db.transaction((rows: NewDbItem[]) => {
      let inserted = 0;
      for (const item of rows) {
        const result = insert.run({
          id: item.id,
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          feedName: item.feedName ?? null,
          title: item.title,
          description: item.description ?? null,
          url: item.url,
          publishedAt: item.publishedAt.getTime(),
          renderData: JSON.stringify(item.renderData),
          createdAt: item.createdAt.getTime(),
        });
        inserted += result.changes;
      }
      return inserted;
    });

    return insertMany(items) as number;
  };

  const updateItemStatus = (id: string, status: "unread" | "archived" | "read-later"): void => {
    db.prepare("UPDATE items SET status = ? WHERE id = ?").run(status, id);
  };

  const expireItems = (sourceUrl: string, olderThan: Date): number => {
    const result = db.prepare(
      "UPDATE items SET status = 'expired' WHERE source_url = ? AND status = 'unread' AND created_at < ?"
    ).run(sourceUrl, olderThan.getTime());
    return result.changes;
  };

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

  return {
    getItems,
    upsertItems,
    updateItemStatus,
    expireItems,
    createRun,
    updateRun,
    getRuns,
    recordTimeSession,
    getTimeUsage,
  };
};
