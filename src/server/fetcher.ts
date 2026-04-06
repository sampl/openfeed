import { randomUUID } from "crypto";
import type { DbInterface, NewDbObject } from "./db/interface.js";
import type { FeedConfig, SourceConfig, UserConfig } from "./config.js";
import { resolvePlugin } from "./pluginRegistry.js";
import type { PluginAS2Object, AS2Link, AS2Tag } from "../connectors/types.js";
import { FeedError } from "../connectors/types.js";
import type { SourceResult } from "./db/interface.js";

/** Returns the effective expiration window by walking source → feed → global config. */
const resolveExpirationDays = (
  source: SourceConfig,
  feed: FeedConfig,
  config: UserConfig,
): number | undefined =>
  source.expirationDays ?? feed.expirationDays ?? config.expirationDays;

/**
 * The set of fields that map to explicit columns in the objects table.
 * Any additional keys on a PluginAS2Object are stored in the `extras` column.
 */
const CORE_KEYS = new Set([
  "type", "url", "published", "name", "summary",
  "content", "mediaType", "attachment",
]);

/**
 * Splits a PluginAS2Object into core fields (explicit columns) and extras
 * (any additional AS2 properties to be stored as JSON in the extras column).
 */
const splitExtras = (
  obj: PluginAS2Object
): { extras: Record<string, unknown> | undefined } => {
  const extras: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!CORE_KEYS.has(key)) {
      extras[key] = obj[key];
    }
  }
  return { extras: Object.keys(extras).length > 0 ? extras : undefined };
};

/**
 * Executes a full fetch cycle: iterates every configured source, calls the
 * matching plugin, filters and deduplicates objects, persists them, and
 * records a run entry.
 *
 * @param config      - Parsed user configuration (feeds, limits, schedule).
 * @param db          - Database interface used for persistence.
 * @param triggeredBy - Whether this run was started by the scheduler or a manual API call.
 * @param feedNames   - When provided, only the named feeds are fetched.
 * @returns The UUID of the completed run record.
 */
export const runFetch = async (
  config: UserConfig,
  db: DbInterface,
  triggeredBy: "schedule" | "manual",
  feedNames?: readonly string[]
): Promise<string> => {
  const runId = randomUUID();
  db.createRun({ id: runId, triggeredBy, startedAt: new Date() });

  const sourceResults: SourceResult[] = [];

  const feedsToFetch = feedNames != null
    ? config.feeds.filter((f) => feedNames.includes(f.name))
    : config.feeds;

  for (const feed of feedsToFetch) {
    for (const source of feed.sources) {
      const plugin = resolvePlugin(source.url, source.connector);

      if (plugin.name === "default") {
        sourceResults.push({
          sourceName: source.name,
          sourceUrl: source.url,
          newItemsCount: 0,
          status: "skipped",
        });
        continue;
      }

      try {
        const context = {
          sourceName: source.name,
          sourceUrl: source.url,
          feedName: feed.name,
        };

        const rawObjects = await plugin.listItems(source.url, fetch, context, source.options);

        // Resolve limits: source > feed > global > default
        const maxItems = source.maxItems ?? feed.maxItems ?? config.maxItems ?? 50;
        const maxAgeDays = source.maxAgeDays ?? feed.maxAgeDays ?? config.maxAgeDays ?? 30;
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

        const filtered = rawObjects
          .filter((obj) => obj.published == null || obj.published >= cutoffDate)
          .sort((a, b) => {
            const ta = a.published?.getTime() ?? 0;
            const tb = b.published?.getTime() ?? 0;
            return tb - ta;
          })
          .slice(0, maxItems);

        const now = new Date();
        const dbObjects: NewDbObject[] = filtered.map((obj): NewDbObject => {
          const { extras } = splitExtras(obj);
          return {
            id: randomUUID(),
            type: obj.type,
            name: obj.name,
            summary: obj.summary,
            content: obj.content,
            mediaType: obj.mediaType,
            url: obj.url,
            attachment: obj.attachment,
            extras,
            published: obj.published,
            sourceName: context.sourceName,
            sourceUrl: context.sourceUrl,
            feedName: context.feedName,
            createdAt: now,
          };
        });

        const insertedCount = db.upsertObjects(dbObjects);

        const expirationDays = resolveExpirationDays(source, feed, config);
        if (expirationDays != null) {
          const olderThan = new Date(Date.now() - expirationDays * 24 * 60 * 60 * 1000);
          db.expireObjects(source.url, olderThan);
        }

        sourceResults.push({
          sourceName: source.name,
          sourceUrl: source.url,
          newItemsCount: insertedCount,
          status: "success",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof FeedError ? error.code : "unknown";
        console.error(`[openfeed] Failed to fetch ${source.name} [${errorCode}]: ${errorMessage}`);
        sourceResults.push({
          sourceName: source.name,
          sourceUrl: source.url,
          newItemsCount: 0,
          status: "error",
          errorMessage,
          errorCode,
        });
      }
    }
  }

  const hasErrors = sourceResults.some((r) => r.status === "error");

  db.updateRun(runId, {
    status: hasErrors ? "error" : "success",
    completedAt: new Date(),
    sourceResults,
  });

  return runId;
};
