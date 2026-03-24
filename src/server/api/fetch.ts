import { Router } from "express";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";
import { runFetch } from "../fetcher.js";

export const createFetchRouter = (config: UserConfig, db: DbInterface): Router => {
  const router = Router();

  router.post("/", async (_req, res) => {
    try {
      const runId = await runFetch(config, db, "manual");
      res.json({ success: true, runId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[open-feed] POST /api/fetch — fetch failed: ${message}`);
      res.status(500).json({ error: `The fetch could not be started. ${message}` });
    }
  });

  return router;
};
