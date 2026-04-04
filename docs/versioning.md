# Versioning

OpenFeed is self-hosted software. Once you install it, your database lives on your server — we never have access to it. The versioning system is designed with that in mind: everything is automatic, explicit, and safe to run without thinking about it.

## The Version Number

There is one version number: the `version` field in `package.json`. It follows [semantic versioning](https://semver.org) (e.g. `0.1.0`).

This same number is:

- Reported by `GET /api/version`
- The version shown in any release tags on GitHub

There is no separate API version, no header-based versioning, and no `/v1/` URL prefix. Because OpenFeed is self-hosted, a given server always runs exactly one version of the software, so URL-based API versioning adds complexity without benefit.

## Checking What Version Is Running

```
GET /api/version
```

This endpoint is always public (no access key required). It returns:

```json
{
  "version": "0.1.0",
  "dbVersion": 4
}
```

- `version` — the application version from `package.json`
- `dbVersion` — the highest database migration that has been applied (see below)

## Database Migrations

The database schema evolves through numbered migrations defined in `src/server/db/migrations.ts`. Each migration has:

- A sequential integer version (`1`, `2`, `3`, ...)
- A short description
- An `up()` function that applies the schema change

Migrations are tracked in a `schema_migrations` table inside your SQLite database:

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  description TEXT    NOT NULL,
  applied_at  INTEGER NOT NULL  -- Unix milliseconds
)
```

**Migrations run automatically on startup.** When you upgrade OpenFeed and restart the server, any new migrations are applied before the server begins handling requests. No manual database steps are required.

Each migration runs inside a transaction — if something goes wrong mid-migration, no partial change is committed and the migration will be retried on the next startup.

### Existing Databases

If you have a database created before the migration system was introduced (i.e. `schema_migrations` is empty but your tables already exist), OpenFeed detects this on first boot and stamps the existing migrations as already applied without re-running them. Your data is not touched.

## Upgrade Process

```bash
# From inside your openfeed directory:
bash scripts/setup.sh
```

That's it. The script pulls the latest code, installs dependencies, and rebuilds. When you restart the server, any new migrations run automatically.

After restarting, confirm the upgrade with:

```bash
curl http://localhost:3000/api/version
```

## Adding a Migration (For Contributors)

When a schema change is needed:

1. Open `src/server/db/migrations.ts`
2. Append a new entry to the `MIGRATIONS` array with the next sequential `version` number:

```typescript
{
  version: 5,
  description: "Add read_at column to items",
  up: (db) => {
    db.exec("ALTER TABLE items ADD COLUMN read_at INTEGER");
  },
},
```

3. Bump the `version` field in `package.json` (at minimum a patch bump)
4. Include both changes in the same commit/PR

**Rules:**

- Never renumber or modify a migration that has already been released — existing installs will have already applied it
- Always append; never insert in the middle
- Keep each migration focused on a single, atomic schema change
- Prefer `ALTER TABLE` and `CREATE TABLE` over `DROP TABLE` — preserve user data whenever possible
- If a migration could be slow on large datasets, note it in the description
