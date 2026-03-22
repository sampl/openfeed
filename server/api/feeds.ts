import { Router } from "express";
import type { UserConfig } from "../config.js";

export const createFeedsRouter = (config: UserConfig): Router => {
  const router = Router();

  router.get("/", (_req, res) => {
    const feeds = config.feeds.map((f) => ({ name: f.name }));
    res.json(feeds);
  });

  return router;
};
