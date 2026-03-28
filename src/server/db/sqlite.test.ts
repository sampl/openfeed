// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createSqliteDb } from "./index.js";
import type { DbInterface, NewDbItem, NewRun } from "./interface.js";

const makeItem = (overrides: Partial<NewDbItem> = {}): NewDbItem => ({
  id: "item-1",
  sourceName: "Test Source",
  sourceUrl: "https://example.com/feed",
  title: "Test Item",
  description: "A test item",
  url: "https://example.com/item-1",
  publishedAt: new Date("2024-01-01T00:00:00Z"),
  renderData: { richText: { text: "Test content" } },
  createdAt: new Date("2024-01-01T00:00:00Z"),
  ...overrides,
});

const makeRun = (overrides: Partial<NewRun> = {}): NewRun => ({
  id: "run-1",
  triggeredBy: "manual",
  startedAt: new Date("2024-01-01T00:00:00Z"),
  ...overrides,
});

let db: DbInterface;

describe("sqlite adapter", () => {
  beforeEach(() => {
    db = createSqliteDb(":memory:");
  });

  describe("upsertItems", () => {
    it("inserts items and returns count", () => {
      const items = [
        makeItem({ id: "item-1", url: "https://example.com/a" }),
        makeItem({ id: "item-2", url: "https://example.com/b" }),
      ];
      const count = db.upsertItems(items);
      expect(count).toBe(2);
    });

    it("deduplicates by url — second insert of same url returns 0", () => {
      const item = makeItem({ id: "item-1", url: "https://example.com/a" });
      db.upsertItems([item]);
      const duplicateCount = db.upsertItems([{ ...item, id: "item-2" }]);
      expect(duplicateCount).toBe(0);
    });
  });

  describe("updateItemStatus", () => {
    it("changes status correctly", () => {
      db.upsertItems([makeItem({ id: "item-1", url: "https://example.com/a" })]);
      db.updateItemStatus("item-1", "archived");

      const { items: unread } = db.getItems("unread");
      const { items: archived } = db.getItems("archived");
      expect(unread).toHaveLength(0);
      expect(archived).toHaveLength(1);
      expect(archived[0].status).toBe("archived");
    });
  });

  describe("getItems", () => {
    it("filters by status correctly", () => {
      db.upsertItems([
        makeItem({ id: "item-1", url: "https://example.com/a" }),
        makeItem({ id: "item-2", url: "https://example.com/b" }),
      ]);
      db.updateItemStatus("item-2", "archived");

      const { items: unread } = db.getItems("unread");
      const { items: archived } = db.getItems("archived");
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe("item-1");
      expect(archived).toHaveLength(1);
      expect(archived[0].id).toBe("item-2");
    });
  });

  describe("createRun", () => {
    it("creates a run with 'running' status", () => {
      const runId = db.createRun(makeRun({ id: "run-1" }));
      expect(runId).toBe("run-1");

      const runs = db.getRuns();
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe("running");
      expect(runs[0].id).toBe("run-1");
    });
  });

  describe("updateRun", () => {
    it("updates status, completedAt, and sourceResults", () => {
      db.createRun(makeRun({ id: "run-1" }));
      const completedAt = new Date("2024-01-01T01:00:00Z");
      const sourceResults = [
        {
          sourceName: "Test",
          sourceUrl: "https://example.com",
          newItemsCount: 3,
          status: "success" as const,
        },
      ];
      db.updateRun("run-1", { status: "success", completedAt, sourceResults });

      const runs = db.getRuns();
      expect(runs[0].status).toBe("success");
      expect(runs[0].completedAt?.getTime()).toBe(completedAt.getTime());
      expect(runs[0].sourceResults).toEqual(sourceResults);
    });
  });

  describe("getRuns", () => {
    it("returns runs ordered by startedAt DESC", () => {
      db.createRun(makeRun({ id: "run-a", startedAt: new Date("2024-01-01T00:00:00Z") }));
      db.createRun(makeRun({ id: "run-b", startedAt: new Date("2024-01-03T00:00:00Z") }));
      db.createRun(makeRun({ id: "run-c", startedAt: new Date("2024-01-02T00:00:00Z") }));

      const runs = db.getRuns();
      expect(runs[0].id).toBe("run-b");
      expect(runs[1].id).toBe("run-c");
      expect(runs[2].id).toBe("run-a");
    });
  });
});
