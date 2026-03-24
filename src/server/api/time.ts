import { Router } from "express";
import { randomUUID } from "crypto";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";
import type { TimeLimitsResponse, TimeUsageResponse } from "../../plugins/types.js";

export const createTimeRouter = (config: UserConfig, db: DbInterface): Router => {
  const router = Router();

  // Returns configured time limits from the YAML config
  router.get("/limits", (_req, res) => {
    const byFeed: TimeLimitsResponse["byFeed"] = {};
    for (const feed of config.feeds) {
      if (feed.timeLimit != null) {
        byFeed[feed.name] = feed.timeLimit;
      }
    }
    const response: TimeLimitsResponse = {
      global: config.timeLimit ?? null,
      byFeed,
    };
    res.json(response);
  });

  // Returns today's time usage in minutes
  router.get("/usage", (req, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error(`[openfeed] GET /api/time/usage — invalid date: ${JSON.stringify(date)}`);
      res.status(400).json({ error: "Please provide a date in YYYY-MM-DD format (e.g. 2024-01-15)." });
      return;
    }
    const usage = db.getTimeUsage(date);
    const byFeed: Record<string, number> = {};
    for (const [feedName, ms] of Object.entries(usage.byFeed)) {
      byFeed[feedName] = Math.round((ms / 60000) * 10) / 10;
    }
    const response: TimeUsageResponse = {
      byFeed,
      total: Math.round((usage.total / 60000) * 10) / 10,
    };
    res.json(response);
  });

  // Records a time session
  router.post("/sessions", (req, res) => {
    const { feedName, durationMs, date } = req.body as {
      feedName?: unknown;
      durationMs?: unknown;
      date?: unknown;
    };

    if (typeof durationMs !== "number" || durationMs <= 0) {
      console.error(`[openfeed] POST /api/time/sessions — invalid durationMs: ${JSON.stringify(durationMs)}`);
      res.status(400).json({ error: "Reading duration must be a positive number of milliseconds." });
      return;
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error(`[openfeed] POST /api/time/sessions — invalid date: ${JSON.stringify(date)}`);
      res.status(400).json({ error: "Please provide a date in YYYY-MM-DD format (e.g. 2024-01-15)." });
      return;
    }

    db.recordTimeSession({
      id: randomUUID(),
      feedName: typeof feedName === "string" ? feedName : undefined,
      date,
      durationMs: Math.round(durationMs),
      createdAt: new Date(),
    });

    res.json({ success: true });
  });

  return router;
};
