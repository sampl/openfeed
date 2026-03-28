import { Router } from "express";
import type { DbInterface } from "../db/interface.js";
import type { ItemStatus } from "../../connectors/types.js";
import { resolvePlugin } from "../pluginRegistry.js";
import { parsePagination } from "./utils.js";

const ITEM_STATUSES: readonly ItemStatus[] = ["unread", "archived", "read-later"];

export const createItemsRouter = (db: DbInterface): Router => {
  const router = Router();

  router.get("/", (req, res) => {
    const requestedStatus = req.query.status as string;
    const status: ItemStatus = (ITEM_STATUSES as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as ItemStatus)
      : "unread";
    const feedName = typeof req.query.feed === "string" ? req.query.feed : undefined;
    const { limit, offset } = parsePagination(req, { defaultLimit: 30, maxLimit: 100 });
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

    if (status == null || !(ITEM_STATUSES as readonly string[]).includes(status)) {
      console.error(`[openfeed] PATCH /api/items/${id} — invalid status: ${JSON.stringify(status)}`);
      res.status(400).json({ error: `"${status}" is not a valid item status. Use "unread", "archived", or "read-later".` });
      return;
    }

    db.updateItemStatus(id, status as ItemStatus);
    res.json({ success: true });
  });

  return router;
};
