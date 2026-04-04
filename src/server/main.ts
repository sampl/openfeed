#!/usr/bin/env node

import "dotenv/config";
import { loadConfig } from "./config.js";
import { createSqliteDb } from "./db/index.js";
import { createServer } from "./server.js";
import { startScheduler } from "./scheduler.js";
import { runFetch } from "./fetcher.js";
import { resolveDbPathArg } from "./cliArgs.js";
import { loadExternalConnectors, listConnectors } from "./pluginRegistry.js";
import path from "path";

const args = process.argv.slice(2);

/**
 * After external connectors are loaded, verify that every `connector:` value
 * referenced in the config actually resolves to a registered connector.
 * Throws with a helpful message if any are unknown.
 */
const validateConnectorReferences = (config: ReturnType<typeof loadConfig>): void => {
  const missing = config.feeds
    .flatMap((f) => f.sources)
    .flatMap((s) => (s.connector != null ? [s.connector] : []))
    .filter((name) => !listConnectors().some((p) => p.name === name));

  if (missing.length > 0) {
    const available = listConnectors().map((p) => p.name).join(", ");
    throw new Error(
      `[openfeed] Unknown connector(s) referenced in config: ${missing.join(", ")}.\n` +
        `Available connectors: ${available}`
    );
  }
};

// Support: openfeed fetch (manual trigger, no server)
if (args[0] === "fetch") {
  (async () => {
    const configPath = args[args.indexOf("--config") + 1] ?? "openfeed.yaml";
    const config = loadConfig(configPath);
    const configDir = path.dirname(path.resolve(configPath));
    await loadExternalConnectors(config.connectors, config.connectorsDir, configDir);
    validateConnectorReferences(config);
    const dbPath = resolveDbPathArg(args);
    const db = createSqliteDb(path.resolve(dbPath));
    console.log("[openfeed] Running manual fetch...");
    runFetch(config, db, "manual").then((runId) => {
      console.log(`[openfeed] Fetch complete (run: ${runId})`);
      process.exit(0);
    });
  })().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
} else {
  (async () => {
    // Parse args
    const portArgIndex = args.indexOf("--port");
    const portArg = portArgIndex >= 0 ? parseInt(args[portArgIndex + 1], 10) : undefined;
    const configArgIndex = args.indexOf("--config");
    const configPath = configArgIndex >= 0 ? args[configArgIndex + 1] : "openfeed.yaml";
    const dbPath = resolveDbPathArg(args);

    const config = loadConfig(configPath);
    const configDir = path.dirname(path.resolve(configPath));

    await loadExternalConnectors(config.connectors, config.connectorsDir, configDir);
    validateConnectorReferences(config);

    const port = portArg ?? config.port;
    const db = createSqliteDb(path.resolve(dbPath));

    const accessKey = process.env.OPENFEED_ACCESS_KEY?.trim() || undefined;
    if (accessKey) {
      console.log("[openfeed] Access key protection enabled (OPENFEED_ACCESS_KEY)");
    }

    const app = createServer(config, db, path.resolve(configPath), accessKey);

    app.listen(port, () => {
      console.log(`[openfeed] Server running at http://localhost:${port}`);
      console.log(`[openfeed] Fetch schedule: ${config.schedule}`);
    });

    startScheduler(config, db);
  })().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
