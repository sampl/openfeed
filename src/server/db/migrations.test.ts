// @vitest-environment node
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { MIGRATIONS, runMigrations } from "./migrations.js";

describe("MIGRATIONS array", () => {
  it("has sequential version numbers with no gaps or duplicates", () => {
    const versions = MIGRATIONS.map((m) => m.version);
    for (let i = 0; i < versions.length; i++) {
      expect(versions[i]).toBe(i + 1);
    }
  });

  it("each migration has a non-empty description", () => {
    for (const m of MIGRATIONS) {
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
});

describe("runMigrations", () => {
  it("applies all migrations on a fresh database", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    const applied = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
      .all() as { version: number }[];

    expect(applied).toHaveLength(MIGRATIONS.length);
    expect(applied.map((r) => r.version)).toEqual(MIGRATIONS.map((m) => m.version));
  });

  it("is idempotent — running twice produces the same result with no error", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    runMigrations(db);

    const applied = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
      .all() as { version: number }[];

    expect(applied).toHaveLength(MIGRATIONS.length);
  });

  it("creates all expected tables", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]
    ).map((r) => r.name);

    expect(tables).toContain("items");
    expect(tables).toContain("runs");
    expect(tables).toContain("time_sessions");
    expect(tables).toContain("schema_migrations");
  });

  it("stamps existing tables as applied without re-running migrations (bootstrap)", () => {
    // Simulate a pre-migration database: create old schema manually
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL UNIQUE,
        published_at INTEGER,
        render_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at INTEGER NOT NULL,
        feed_name TEXT
      );
      CREATE TABLE runs (
        id TEXT PRIMARY KEY,
        triggered_by TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        status TEXT NOT NULL,
        error_message TEXT,
        source_results TEXT
      );
      CREATE TABLE time_sessions (
        id TEXT PRIMARY KEY,
        feed_name TEXT,
        date TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Insert some existing data
    db.exec(`
      INSERT INTO items (id, source_name, source_url, title, url, render_data, status, created_at)
      VALUES ('existing-item', 'Test', 'https://example.com', 'Title', 'https://example.com/1', '{}', 'unread', 0)
    `);

    // Run migrations — should not error and should not wipe the existing data
    runMigrations(db);

    // All migrations should be stamped as applied
    const applied = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
      .all() as { version: number }[];
    expect(applied).toHaveLength(MIGRATIONS.length);

    // Existing data should be preserved
    const items = db.prepare("SELECT * FROM items").all();
    expect(items).toHaveLength(1);
  });
});
