import { Router } from "express";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";
import type { FeedErrorCode } from "../../connectors/types.js";

export interface SourceSummary {
  readonly name: string;
  readonly url: string;
  readonly feedName: string;
  readonly connector?: string;
  readonly lastStatus?: "success" | "error" | "skipped";
  readonly lastErrorMessage?: string;
  readonly lastErrorCode?: FeedErrorCode;
}

export const createSourcesRouter = (config: UserConfig, db: DbInterface): Router => {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      // Build a flat list of all configured sources
      const allSources: SourceSummary[] = config.feeds.flatMap((feed) =>
        feed.sources.map((source) => ({
          name: source.name,
          url: source.url,
          feedName: feed.name,
          connector: source.connector,
        }))
      );

      // Overlay the last run's per-source results if available
      const [latestRun] = db.getRuns(1);
      if (latestRun != null) {
        const resultsByUrl = new Map(
          latestRun.sourceResults.map((r) => [r.sourceUrl, r])
        );

        return res.json(
          allSources.map((source) => {
            const result = resultsByUrl.get(source.url);
            if (result == null) return source;
            return {
              ...source,
              lastStatus: result.status,
              lastErrorMessage: result.errorMessage,
              lastErrorCode: result.errorCode,
            };
          })
        );
      }

      res.json(allSources);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[openfeed] GET /api/sources — error: ${message}`);
      res.status(500).json({ error: "Could not load sources." });
    }
  });

  return router;
};
