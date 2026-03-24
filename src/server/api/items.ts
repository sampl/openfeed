import { Router } from "express";
import type { DbInterface } from "../db/interface.js";
import { resolvePlugin } from "../pluginRegistry.js";

export const createItemsRouter = (db: DbInterface): Router => {
  const router = Router();

  router.get("/", (req, res) => {
    const validStatuses = ["unread", "archived", "read-later"] as const;
    type ValidStatus = typeof validStatuses[number];
    const requestedStatus = req.query.status as string;
    const status: ValidStatus = (validStatuses as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as ValidStatus)
      : "unread";
    const feedName = typeof req.query.feed === "string" ? req.query.feed : undefined;
    const limitParam = parseInt(String(req.query.limit ?? ""), 10);
    const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 30;
    const offsetParam = parseInt(String(req.query.offset ?? ""), 10);
    const offset = !isNaN(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
    const result = db.getItems(status, feedName, limit, offset);
    const items = result.items.map((item) => {
      const plugin = resolvePlugin(item.sourceUrl);
      if (!plugin.icon) return item;
      return { ...item, sourceIconUrl: `data:image/svg+xml,${encodeURIComponent(plugin.icon)}` };
    });
    res.json({ ...result, items });
  });

  router.patch("/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (status !== "unread" && status !== "archived" && status !== "read-later") {
      console.error(`[openfeed] PATCH /api/items/${id} — invalid status: ${JSON.stringify(status)}`);
      res.status(400).json({ error: `"${status}" is not a valid item status. Use "unread", "archived", or "read-later".` });
      return;
    }

    db.updateItemStatus(id, status);
    res.json({ success: true });
  });

  return router;
};
