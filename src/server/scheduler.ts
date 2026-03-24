import cron from "node-cron";
import type { DbInterface } from "./db/interface.js";
import type { UserConfig } from "./config.js";
import { runFetch } from "./fetcher.js";

export const startScheduler = (config: UserConfig, db: DbInterface): void => {
  // Feeds with a custom schedule run independently; the rest run on the global schedule
  const feedsWithCustomSchedule = config.feeds.filter((f) => f.schedule != null);
  const customScheduleFeedNames = new Set(feedsWithCustomSchedule.map((f) => f.name));
  const globalFeedNames = config.feeds
    .filter((f) => !customScheduleFeedNames.has(f.name))
    .map((f) => f.name);

  if (globalFeedNames.length > 0) {
    console.log(`[openfeed] Global scheduler started (${config.schedule}): ${globalFeedNames.join(", ")}`);
    cron.schedule(config.schedule, async () => {
      console.log("[openfeed] Running scheduled fetch...");
      try {
        const runId = await runFetch(config, db, "schedule", globalFeedNames);
        console.log(`[openfeed] Scheduled fetch complete (run: ${runId})`);
      } catch (error) {
        console.error("[openfeed] Scheduled fetch failed:", error);
      }
    });
  }

  for (const feed of feedsWithCustomSchedule) {
    console.log(`[openfeed] Per-feed scheduler started for "${feed.name}" (${feed.schedule})`);
    cron.schedule(feed.schedule!, async () => {
      console.log(`[openfeed] Running scheduled fetch for "${feed.name}"...`);
      try {
        const runId = await runFetch(config, db, "schedule", [feed.name]);
        console.log(`[openfeed] Scheduled fetch for "${feed.name}" complete (run: ${runId})`);
      } catch (error) {
        console.error(`[openfeed] Scheduled fetch for "${feed.name}" failed:`, error);
      }
    });
  }
};
