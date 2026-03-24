#!/usr/bin/env node

import "dotenv/config";
import { loadConfig } from "./config.js";
import { createSqliteDb } from "./db/index.js";
import { createServer } from "./server.js";
import { startScheduler } from "./scheduler.js";
import { runFetch } from "./fetcher.js";
import { resolveDbPathArg } from "./cliArgs.js";
import path from "path";

const args = process.argv.slice(2);

// Support: openfeed fetch (manual trigger, no server)
if (args[0] === "fetch") {
  const configPath = args[args.indexOf("--config") + 1] ?? "openfeed.yaml";
  const config = loadConfig(configPath);
  const dbPath = resolveDbPathArg(args);
  const db = createSqliteDb(path.resolve(dbPath));
  console.log("[openfeed] Running manual fetch...");
  runFetch(config, db, "manual").then((runId) => {
    console.log(`[openfeed] Fetch complete (run: ${runId})`);
    process.exit(0);
  });
} else {
  // Parse args
  const portArgIndex = args.indexOf("--port");
  const portArg = portArgIndex >= 0 ? parseInt(args[portArgIndex + 1], 10) : undefined;
  const configArgIndex = args.indexOf("--config");
  const configPath = configArgIndex >= 0 ? args[configArgIndex + 1] : "openfeed.yaml";
  const dbPath = resolveDbPathArg(args);

  const config = loadConfig(configPath);
  const port = portArg ?? config.port;
  const db = createSqliteDb(path.resolve(dbPath));

  const app = createServer(config, db, path.resolve(configPath));

  app.listen(port, () => {
    console.log(`[openfeed] Server running at http://localhost:${port}`);
    console.log(`[openfeed] Fetch schedule: ${config.schedule}`);
  });

  startScheduler(config, db);
}
