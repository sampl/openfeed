// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createSqliteDb } from "./index.js";
import type { DbInterface, NewDbObject, NewRun } from "./interface.js";

const makeObject = (overrides: Partial<NewDbObject> = {}): NewDbObject => ({
  id: "obj-1",
  type: "Article",
  name: "Test Article",
  summary: "A test article",
  url: "https://example.com/item-1",
  published: new Date("2024-01-01T00:00:00Z"),
  sourceName: "Test Source",
  sourceUrl: "https://example.com/feed",
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

  describe("upsertObjects", () => {
    it("inserts objects and returns count", () => {
      const objects = [
        makeObject({ id: "obj-1", url: "https://example.com/a" }),
        makeObject({ id: "obj-2", url: "https://example.com/b" }),
      ];
      const count = db.upsertObjects(objects);
      expect(count).toBe(2);
    });

    it("deduplicates by url — second insert of same url returns 0", () => {
      const obj = makeObject({ id: "obj-1", url: "https://example.com/a" });
      db.upsertObjects([obj]);
      const duplicateCount = db.upsertObjects([{ ...obj, id: "obj-2" }]);
      expect(duplicateCount).toBe(0);
    });

    it("automatically creates a Create activity for each new object", () => {
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a" })]);
      expect(db.hasActivity("obj-1", "Create")).toBe(true);
    });

    it("does not create a Create activity for duplicate inserts", () => {
      const obj = makeObject({ id: "obj-1", url: "https://example.com/a" });
      db.upsertObjects([obj]);
      db.upsertObjects([{ ...obj, id: "obj-2" }]); // duplicate URL
      // Only one Create activity should exist (for the first insert)
      expect(db.hasActivity("obj-1", "Create")).toBe(true);
      expect(db.objectExists("obj-2")).toBe(false);
    });
  });

  describe("createActivity + hasActivity", () => {
    it("creates a Read activity and hasActivity returns true", () => {
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a" })]);
      db.createActivity({
        id: "act-1",
        type: "Read",
        objectId: "obj-1",
        published: new Date(),
        createdAt: new Date(),
      });
      expect(db.hasActivity("obj-1", "Read")).toBe(true);
    });

    it("creates an Add activity with a target", () => {
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a" })]);
      db.createActivity({
        id: "act-1",
        type: "Add",
        objectId: "obj-1",
        target: { type: "Collection", name: "read-later" },
        published: new Date(),
        createdAt: new Date(),
      });
      expect(db.hasActivity("obj-1", "Add")).toBe(true);
    });
  });

  describe("getUnreadObjects", () => {
    it("returns objects with Create but no Read activity", () => {
      db.upsertObjects([
        makeObject({ id: "obj-1", url: "https://example.com/a" }),
        makeObject({ id: "obj-2", url: "https://example.com/b" }),
      ]);
      // Mark obj-2 as read
      db.createActivity({ id: "act-1", type: "Read", objectId: "obj-2", published: new Date(), createdAt: new Date() });

      const { objects } = db.getUnreadObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0].id).toBe("obj-1");
    });

    it("filters by feedName", () => {
      db.upsertObjects([
        makeObject({ id: "obj-1", url: "https://example.com/a", feedName: "Tech" }),
        makeObject({ id: "obj-2", url: "https://example.com/b", feedName: "News" }),
      ]);

      const { objects: techObjects } = db.getUnreadObjects("Tech");
      expect(techObjects).toHaveLength(1);
      expect(techObjects[0].id).toBe("obj-1");

      const { objects: newsObjects } = db.getUnreadObjects("News");
      expect(newsObjects).toHaveLength(1);
      expect(newsObjects[0].id).toBe("obj-2");
    });
  });

  describe("getSavedObjects", () => {
    it("returns objects with Add but no Read activity", () => {
      db.upsertObjects([
        makeObject({ id: "obj-1", url: "https://example.com/a" }),
        makeObject({ id: "obj-2", url: "https://example.com/b" }),
      ]);

      // Save obj-1
      db.createActivity({ id: "act-1", type: "Add", objectId: "obj-1", target: { type: "Collection", name: "read-later" }, published: new Date(), createdAt: new Date() });

      const { objects } = db.getSavedObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0].id).toBe("obj-1");
    });

    it("excludes saved objects that were also read", () => {
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a" })]);
      db.createActivity({ id: "act-1", type: "Add", objectId: "obj-1", target: { type: "Collection", name: "read-later" }, published: new Date(), createdAt: new Date() });
      db.createActivity({ id: "act-2", type: "Read", objectId: "obj-1", published: new Date(), createdAt: new Date() });

      const { objects } = db.getSavedObjects();
      expect(objects).toHaveLength(0);
    });
  });

  describe("expireObjects", () => {
    it("creates Read activities for old unread objects", () => {
      const oldDate = new Date("2020-01-01T00:00:00Z");
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a", createdAt: oldDate })]);

      const olderThan = new Date("2024-01-01T00:00:00Z");
      const count = db.expireObjects("https://example.com/feed", olderThan);
      expect(count).toBe(1);
      expect(db.hasActivity("obj-1", "Read")).toBe(true);

      // Should now be gone from unread
      const { objects } = db.getUnreadObjects();
      expect(objects).toHaveLength(0);
    });
  });

  describe("objectExists", () => {
    it("returns true for existing objects", () => {
      db.upsertObjects([makeObject({ id: "obj-1", url: "https://example.com/a" })]);
      expect(db.objectExists("obj-1")).toBe(true);
    });

    it("returns false for non-existent objects", () => {
      expect(db.objectExists("nonexistent")).toBe(false);
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

  describe("getDbVersion", () => {
    it("returns the highest applied migration number after init", () => {
      const version = db.getDbVersion();
      expect(version).toBe(7);
    });
  });
});
