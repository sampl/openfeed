// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import type { DbInterface } from "../db/interface.js";

vi.mock("../pluginRegistry.js", () => ({
  resolvePlugin: vi.fn(() => ({ name: "rss", icon: undefined })),
}));

import { createItemsRouter } from "./items.js";

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(() => ({ items: [], hasMore: false, total: 0 })),
  upsertItems: vi.fn(() => 0),
  updateItemStatus: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRuns: vi.fn(() => []),
  getTimeUsage: vi.fn(() => ({ byFeed: {}, total: 0 })),
  recordTimeSession: vi.fn(),
});

// Starts a test Express server on a random port. Returns a base URL and a
// cleanup function. Using a real HTTP server avoids supertest as a dependency.
const startTestServer = (router: express.Router, path: string) =>
  new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    const app = express();
    app.use(express.json());
    app.use(path, router);
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        baseUrl: `http://localhost:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });

describe("items router", () => {
  let db: DbInterface;
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    db = createMockDb();
    ({ baseUrl, close } = await startTestServer(createItemsRouter(db), "/api/items"));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  describe("GET /api/items", () => {
    it("returns items from the database", async () => {
      const mockItems = [
        { id: "1", sourceName: "Test", sourceUrl: "https://example.com", title: "Item 1", url: "https://example.com/1", status: "unread" },
      ];
      (db.getItems as ReturnType<typeof vi.fn>).mockReturnValue({ items: mockItems, hasMore: false, total: 1 });

      const res = await fetch(`${baseUrl}/api/items?status=unread`);
      const body = await res.json() as { items: unknown[]; hasMore: boolean; total: number };

      expect(res.status).toBe(200);
      expect(body.items).toHaveLength(1);
      expect(body.hasMore).toBe(false);
      expect(body.total).toBe(1);
    });

    it("defaults to unread status when status param is missing", async () => {
      await fetch(`${baseUrl}/api/items`);
      expect(db.getItems).toHaveBeenCalledWith("unread", undefined, 30, 0);
    });

    it("defaults to unread status when status param is invalid", async () => {
      await fetch(`${baseUrl}/api/items?status=bogus`);
      expect(db.getItems).toHaveBeenCalledWith("unread", undefined, 30, 0);
    });

    it("passes feedName filter to db when provided", async () => {
      await fetch(`${baseUrl}/api/items?status=unread&feed=Tech`);
      expect(db.getItems).toHaveBeenCalledWith("unread", "Tech", 30, 0);
    });

    it("respects limit and offset params", async () => {
      await fetch(`${baseUrl}/api/items?status=archived&limit=10&offset=20`);
      expect(db.getItems).toHaveBeenCalledWith("archived", undefined, 10, 20);
    });

    it("caps limit at 100", async () => {
      await fetch(`${baseUrl}/api/items?limit=999`);
      expect(db.getItems).toHaveBeenCalledWith("unread", undefined, 100, 0);
    });
  });

  describe("PATCH /api/items/:id", () => {
    it("updates item status and returns success", async () => {
      const res = await fetch(`${baseUrl}/api/items/item-123`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const body = await res.json() as { success: boolean };

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(db.updateItemStatus).toHaveBeenCalledWith("item-123", "archived");
    });

    it("returns 400 for an invalid status", async () => {
      const res = await fetch(`${baseUrl}/api/items/item-123`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "deleted" }),
      });
      const body = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(body.error).toContain("deleted");
      expect(db.updateItemStatus).not.toHaveBeenCalled();
    });

    it("returns 400 when status is missing from the request body", async () => {
      const res = await fetch(`${baseUrl}/api/items/item-123`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      expect(db.updateItemStatus).not.toHaveBeenCalled();
    });

    it("accepts all three valid statuses", async () => {
      const validStatuses = ["unread", "archived", "read-later"] as const;
      for (const status of validStatuses) {
        const res = await fetch(`${baseUrl}/api/items/item-abc`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        expect(res.status).toBe(200);
      }
      expect(db.updateItemStatus).toHaveBeenCalledTimes(3);
    });
  });
});
