import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import type { DbInterface } from "./db/interface.js";
import type { UserConfig } from "./config.js";
import { createItemsRouter } from "./api/items.js";
import { createFetchRouter } from "./api/fetch.js";
import { createRunsRouter } from "./api/runs.js";
import { createFeedsRouter } from "./api/feeds.js";
import { createTimeRouter } from "./api/time.js";
import { createConfigRouter } from "./api/config.js";
import { createSourcesRouter } from "./api/sources.js";

export const createServer = (config: UserConfig, db: DbInterface, configPath: string) => {
  const app = express();

  app.use(express.json());

  // API routes
  app.use("/api/items", createItemsRouter(db));
  app.use("/api/fetch", createFetchRouter(config, db));
  app.use("/api/runs", createRunsRouter(db));
  app.use("/api/feeds", createFeedsRouter(config));
  app.use("/api/time", createTimeRouter(config, db));
  app.use("/api/config", createConfigRouter(configPath));
  app.use("/api/sources", createSourcesRouter(config, db));

  // Serve the React SPA static files
  // In dev mode, Vite handles this. In production, serve from dist/client/.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDistPath = path.resolve(__dirname, "../client");

  app.use(express.static(clientDistPath));

  // SPA fallback: all non-API routes return index.html
  // no-store prevents the browser from caching index.html between deploys;
  // static JS/CSS assets are safe to cache because Vite gives them content-hashed filenames
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  return app;
};
