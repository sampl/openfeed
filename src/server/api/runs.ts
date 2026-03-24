import { Router } from "express";
import type { DbInterface } from "../db/interface.js";

export const createRunsRouter = (db: DbInterface): Router => {
  const router = Router();

  router.get("/", (req, res) => {
    const limitParam = parseInt(String(req.query.limit ?? ""), 10);
    const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;
    try {
      const runs = db.getRuns(limit);
      res.json(runs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[openfeed] GET /api/runs — database error: ${message}`);
      res.status(500).json({ error: "Could not load fetch history. Please try again." });
    }
  });

  return router;
};
