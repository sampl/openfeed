import { Router } from "express";
import type { DbInterface } from "../db/interface.js";
import { dbObjectToAS2 } from "../db/interface.js";
import { resolvePlugin } from "../pluginRegistry.js";
import { parsePagination } from "./utils.js";

const VALID_VIEWS = ["unread", "saved", "all"] as const;
type ObjectView = (typeof VALID_VIEWS)[number];

export const createObjectsRouter = (db: DbInterface): Router => {
  const router = Router();

  router.get("/", (req, res) => {
    const requestedView = req.query.view as string;
    const view: ObjectView = (VALID_VIEWS as readonly string[]).includes(requestedView)
      ? (requestedView as ObjectView)
      : "unread";

    const feedName = typeof req.query.feed === "string" ? req.query.feed : undefined;
    const { limit, offset } = parsePagination(req, { defaultLimit: 30, maxLimit: 100 });

    let result;
    if (view === "saved") {
      result = db.getSavedObjects(limit, offset);
    } else if (view === "all") {
      result = db.getAllObjects(feedName, limit, offset);
    } else {
      result = db.getUnreadObjects(feedName, limit, offset);
    }

    const items = result.objects.map((obj) => {
      const plugin = resolvePlugin(obj.sourceUrl);
      const base = dbObjectToAS2(obj);
      if (!plugin.icon) return base;
      return { ...base, sourceIconUrl: `data:image/svg+xml,${encodeURIComponent(plugin.icon)}` };
    });

    res.json({ items, hasMore: result.hasMore, total: result.total });
  });

  return router;
};
