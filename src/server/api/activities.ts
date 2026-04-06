import { Router } from "express";
import { randomUUID } from "crypto";
import type { DbInterface } from "../db/interface.js";
import type { AS2ActivityType } from "../../connectors/types.js";

const VALID_TYPES: readonly AS2ActivityType[] = ["Read", "Add"];

export const createActivitiesRouter = (db: DbInterface): Router => {
  const router = Router();

  router.post("/", (req, res) => {
    const { type, objectId, target } = req.body as {
      type?: string;
      objectId?: string;
      target?: { type?: string; name?: string };
    };

    if (typeof objectId !== "string" || !objectId) {
      res.status(400).json({ error: "objectId is required." });
      return;
    }

    if (type == null || !(VALID_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ error: `"${type}" is not a valid activity type. Use "Read" or "Add".` });
      return;
    }

    if (!db.objectExists(objectId)) {
      res.status(404).json({ error: `Object "${objectId}" not found.` });
      return;
    }

    // Idempotent guard: don't create duplicate Read activities
    if (type === "Read" && db.hasActivity(objectId, "Read")) {
      res.status(409).json({ error: "A Read activity already exists for this object." });
      return;
    }

    // Validate the Add target if provided
    let parsedTarget: { type: "Collection"; name: "read-later" } | undefined;
    if (type === "Add") {
      if (target?.type === "Collection" && target?.name === "read-later") {
        parsedTarget = { type: "Collection", name: "read-later" };
      }
    }

    const now = new Date();
    const id = randomUUID();

    db.createActivity({
      id,
      type: type as AS2ActivityType,
      objectId,
      target: parsedTarget,
      published: now,
      createdAt: now,
    });

    res.status(201).json({ id, type, objectId, published: now.toISOString() });
  });

  return router;
};
