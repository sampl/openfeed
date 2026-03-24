import { Router } from "express";
import { readFileSync } from "fs";

export const createConfigRouter = (configPath: string): Router => {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      const raw = readFileSync(configPath, "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[openfeed] GET /api/config — could not read config file: ${message}`);
      res.status(500).json({ error: "Could not read the config file." });
    }
  });

  return router;
};
