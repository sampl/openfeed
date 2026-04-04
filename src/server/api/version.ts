import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import type { DbInterface } from "../db/interface.js";

// Resolve the app version once at startup from package.json.
// In production, this file is at dist/server/api/version.js, so ../../../ is the project root.
// In dev (tsx), this file is at src/server/api/version.ts, so ../../../ is also the project root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../package.json"), "utf-8")
) as { version: string };
const APP_VERSION = pkg.version;

export const createVersionRouter = (db: DbInterface) => {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ version: APP_VERSION, dbVersion: db.getDbVersion() });
  });

  return router;
};
