import { randomUUID } from "crypto";
import type { DbInterface, NewDbItem, SourceResult } from "./db/interface.js";
import type { FeedConfig, SourceConfig, UserConfig } from "./config.js";
import { resolvePlugin } from "./pluginRegistry.js";
import { FeedError } from "../plugins/types.js";

const resolveExpirationDays = (
  source: SourceConfig,
  feed: FeedConfig,
  config: UserConfig,
): number | undefined =>
  source.expirationDays ?? feed.expirationDays ?? config.expirationDays;

export const runFetch = async (
  config: UserConfig,
  db: DbInterface,
  triggeredBy: "schedule" | "manual",
  // When provided, only the named feeds are fetched (used by per-feed schedulers)
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
      const plugin = resolvePlugin(source.url, source.plugin);

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
        const rawItems = await plugin.listItems(source.url, fetch, source.options);

        // Resolve limits: source > feed > global > default
        const maxItems = source.maxItems ?? feed.maxItems ?? config.maxItems ?? 50;
        const maxAgeDays = source.maxAgeDays ?? feed.maxAgeDays ?? config.maxAgeDays ?? 30;
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

        const items = rawItems
          .filter((item) => item.publishedAt >= cutoffDate)
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
          .slice(0, maxItems);

        const dbItems: NewDbItem[] = items.map((item) => ({
          ...item,
          sourceName: source.name, // override with config name
          feedName: feed.name,
          id: randomUUID(),
          createdAt: new Date(),
        }));

        let insertedCount: number;

        if (source.fetchMode === "replace") {
          insertedCount = db.replaceSourceItems(source.url, dbItems);
        } else {
          insertedCount = db.upsertItems(dbItems);
        }

        const expirationDays = resolveExpirationDays(source, feed, config);
        if (expirationDays != null) {
          const olderThan = new Date(Date.now() - expirationDays * 24 * 60 * 60 * 1000);
          db.expireItems(source.url, olderThan);
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
        console.error(`[open-feed] Failed to fetch ${source.name} [${errorCode}]: ${errorMessage}`);
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
