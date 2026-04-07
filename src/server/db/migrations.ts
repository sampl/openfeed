import Database from "better-sqlite3";

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Create items table",
    up: (db) => {
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
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_items_status_published ON items (status, published_at DESC);
      `);
    },
  },
  {
    version: 2,
    description: "Create runs table",
    up: (db) => {
      db.exec(`
        CREATE TABLE runs (
          id TEXT PRIMARY KEY,
          triggered_by TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER,
          status TEXT NOT NULL,
          error_message TEXT,
          source_results TEXT
        );
        CREATE INDEX idx_runs_started ON runs (started_at DESC);
      `);
    },
  },
  {
    version: 3,
    description: "Create time_sessions table",
    up: (db) => {
      db.exec(`
        CREATE TABLE time_sessions (
          id TEXT PRIMARY KEY,
          feed_name TEXT,
          date TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_time_sessions_date ON time_sessions (date, feed_name);
      `);
    },
  },
  {
    version: 4,
    description: "Add feed_name column to items",
    up: (db) => {
      db.exec("ALTER TABLE items ADD COLUMN feed_name TEXT");
    },
  },
  {
    version: 5,
    description: "Create objects and activities tables",
    up: (db) => {
      db.exec(`
        CREATE TABLE objects (
          id          TEXT PRIMARY KEY,
          type        TEXT NOT NULL,
          name        TEXT,
          summary     TEXT,
          content     TEXT,
          media_type  TEXT,
          url         TEXT NOT NULL UNIQUE,
          attachment  TEXT,
          extras      TEXT,
          published   INTEGER,
          source_name TEXT NOT NULL,
          source_url  TEXT NOT NULL,
          feed_name   TEXT,
          created_at  INTEGER NOT NULL
        );
        CREATE INDEX idx_objects_source_url     ON objects (source_url);
        CREATE INDEX idx_objects_published_desc ON objects (published DESC);
        CREATE INDEX idx_objects_feed_published ON objects (feed_name, published DESC);

        CREATE TABLE activities (
          id         TEXT PRIMARY KEY,
          type       TEXT NOT NULL,
          object_id  TEXT NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
          target     TEXT,
          published  INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_activities_object_type ON activities (object_id, type);
        CREATE INDEX idx_activities_type_pub    ON activities (type, published DESC);
      `);
    },
  },
  {
    version: 6,
    description: "Migrate items to objects and activities",
    up: (db) => {
      // Only run if the legacy items table still exists
      const itemsExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items'")
        .get();
      if (!itemsExists) return;

      db.exec(`
        INSERT OR IGNORE INTO objects
          (id, type, name, summary, content, media_type, url, attachment, published, source_name, source_url, feed_name, created_at)
        SELECT
          id,
          CASE
            WHEN json_extract(render_data, '$.video') IS NOT NULL THEN 'Video'
            WHEN json_extract(render_data, '$.audio') IS NOT NULL THEN 'Audio'
            ELSE 'Article'
          END,
          title,
          description,
          json_extract(render_data, '$.richText.html'),
          CASE
            WHEN json_extract(render_data, '$.video') IS NOT NULL THEN 'text/html'
            WHEN json_extract(render_data, '$.audio') IS NOT NULL THEN 'audio/mpeg'
            ELSE 'text/html'
          END,
          url,
          CASE
            WHEN json_extract(render_data, '$.video.videoId') IS NOT NULL
              THEN json_array(json_object(
                'type', 'Link',
                'href', 'https://www.youtube.com/embed/' || json_extract(render_data, '$.video.videoId'),
                'mediaType', 'text/html',
                'rel', 'video'
              ))
            WHEN json_extract(render_data, '$.audio.url') IS NOT NULL
              THEN json_array(json_object(
                'type', 'Link',
                'href', json_extract(render_data, '$.audio.url'),
                'mediaType', 'audio/mpeg',
                'rel', 'enclosure'
              ))
            ELSE NULL
          END,
          published_at,
          source_name,
          source_url,
          feed_name,
          created_at
        FROM items;

        INSERT OR IGNORE INTO activities (id, type, object_id, published, created_at)
        SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
               'Create',
               id,
               COALESCE(published_at, created_at),
               created_at
        FROM items;

        INSERT OR IGNORE INTO activities (id, type, object_id, published, created_at)
        SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
               'Read',
               id,
               created_at,
               created_at
        FROM items WHERE status IN ('archived', 'expired');

        INSERT OR IGNORE INTO activities (id, type, object_id, target, published, created_at)
        SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
               'Add',
               id,
               '{"type":"Collection","name":"read-later"}',
               created_at,
               created_at
        FROM items WHERE status = 'read-later';
      `);
    },
  },
  {
    version: 7,
    description: "Drop legacy items table",
    up: (db) => {
      const itemsExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items'")
        .get();
      if (itemsExists) {
        db.exec("DROP TABLE items");
      }
    },
  },
];

/**
 * Checks whether the database predates the migration system by looking for
 * existing tables in sqlite_master. If so, stamps those migrations as already
 * applied so they are not re-run against an existing schema.
 */
const bootstrapExistingDb = (db: Database.Database): void => {
  const tableExists = (name: string): boolean => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(name);
    return row != null;
  };

  const columnExists = (table: string, column: string): boolean => {
    const cols = db.pragma(`table_info(${table})`) as { name: string }[];
    return cols.some((c) => c.name === column);
  };

  const now = Date.now();
  const stamp = db.prepare(
    "INSERT OR IGNORE INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)"
  );

  // Migration 1 — items table
  if (tableExists("items")) {
    stamp.run(1, "Create items table", now);
  }
  // Migration 2 — runs table
  if (tableExists("runs")) {
    stamp.run(2, "Create runs table", now);
  }
  // Migration 3 — time_sessions table
  if (tableExists("time_sessions")) {
    stamp.run(3, "Create time_sessions table", now);
  }
  // Migration 4 — feed_name column
  if (tableExists("items") && columnExists("items", "feed_name")) {
    stamp.run(4, "Add feed_name column to items", now);
  }
  // Migration 5 — objects and activities tables
  if (tableExists("objects") && tableExists("activities")) {
    stamp.run(5, "Create objects and activities tables", now);
  }
  // Migration 6 — data migration is only skipped if items table is already gone
  if (!tableExists("items") && tableExists("objects")) {
    stamp.run(6, "Migrate items to objects and activities", now);
  }
  // Migration 7 — items table already dropped (only if objects exists, i.e. not a fresh DB)
  if (!tableExists("items") && tableExists("objects")) {
    stamp.run(7, "Drop legacy items table", now);
  }
};

const pad = (n: number): string => String(n).padStart(3, "0");

export const runMigrations = (db: Database.Database): void => {
  // Bootstrap the tracking table — this is the only IF NOT EXISTS in the system
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  // Detect pre-migration databases and stamp already-applied migrations
  const count = (db.prepare("SELECT COUNT(*) as n FROM schema_migrations").get() as { n: number }).n;
  if (count === 0) {
    bootstrapExistingDb(db);
  }

  // Fetch the set of applied versions
  const applied = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map(
      (r) => r.version
    )
  );

  // Apply pending migrations in order
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    db.transaction(() => {
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)"
      ).run(migration.version, migration.description, Date.now());
    })();

    console.log(`[openfeed] Applied migration ${pad(migration.version)}: ${migration.description}`);
  }
};
