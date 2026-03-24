// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";
import { createTimeRouter } from "./time.js";

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(),
  upsertItems: vi.fn(),
  replaceSourceItems: vi.fn(),
  updateItemStatus: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRuns: vi.fn(),
  getTimeUsage: vi.fn(() => ({ byFeed: {}, total: 0 })),
  recordTimeSession: vi.fn(),
});

const makeConfig = (overrides: Partial<UserConfig> = {}): UserConfig => ({
  port: 3000,
  schedule: "0 7 * * *",
  feeds: [],
  ...overrides,
});

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

describe("time router", () => {
  let db: DbInterface;
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    db = createMockDb();
    ({ baseUrl, close } = await startTestServer(createTimeRouter(makeConfig(), db), "/api/time"));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  describe("GET /api/time/limits", () => {
    it("returns null global limit and empty byFeed when none configured", async () => {
      const res = await fetch(`${baseUrl}/api/time/limits`);
      const body = await res.json() as { global: null; byFeed: Record<string, unknown> };

      expect(res.status).toBe(200);
      expect(body.global).toBeNull();
      expect(body.byFeed).toEqual({});
    });

    it("returns configured global and per-feed limits", async () => {
      const config = makeConfig({
        timeLimit: { daily: 60 },
        feeds: [
          { name: "Tech", sources: [], timeLimit: { daily: 30, weekly: 120 } },
          { name: "News", sources: [] },
        ],
      });
      const { baseUrl: url, close: closeServer } = await startTestServer(createTimeRouter(config, db), "/api/time");

      const res = await fetch(`${url}/api/time/limits`);
      const body = await res.json() as { global: { daily: number }; byFeed: Record<string, { daily?: number; weekly?: number }> };

      expect(body.global).toEqual({ daily: 60 });
      expect(body.byFeed["Tech"]).toEqual({ daily: 30, weekly: 120 });
      expect(body.byFeed["News"]).toBeUndefined();

      await closeServer();
    });
  });

  describe("GET /api/time/usage", () => {
    it("returns usage in minutes for a valid date", async () => {
      (db.getTimeUsage as ReturnType<typeof vi.fn>).mockReturnValue({
        byFeed: { Tech: 90000 }, // 1.5 minutes in ms
        total: 90000,
      });

      const res = await fetch(`${baseUrl}/api/time/usage?date=2024-01-15`);
      const body = await res.json() as { byFeed: Record<string, number>; total: number };

      expect(res.status).toBe(200);
      expect(body.byFeed["Tech"]).toBe(1.5);
      expect(body.total).toBe(1.5);
      expect(db.getTimeUsage).toHaveBeenCalledWith("2024-01-15");
    });

    it("returns 400 when the date is missing", async () => {
      const res = await fetch(`${baseUrl}/api/time/usage`);
      const body = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(body.error).toContain("YYYY-MM-DD");
    });

    it("returns 400 when the date format is invalid", async () => {
      const res = await fetch(`${baseUrl}/api/time/usage?date=January+15`);
      const body = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(body.error).toContain("YYYY-MM-DD");
    });
  });

  describe("POST /api/time/sessions", () => {
    it("records a session and returns success", async () => {
      const res = await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs: 30000, date: "2024-01-15" }),
      });
      const body = await res.json() as { success: boolean };

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(db.recordTimeSession).toHaveBeenCalledOnce();
    });

    it("passes feedName to the database when provided", async () => {
      await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedName: "Tech", durationMs: 15000, date: "2024-01-15" }),
      });

      const call = (db.recordTimeSession as ReturnType<typeof vi.fn>).mock.calls[0][0] as { feedName?: string };
      expect(call.feedName).toBe("Tech");
    });

    it("returns 400 when durationMs is missing", async () => {
      const res = await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2024-01-15" }),
      });
      const body = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(body.error).toContain("milliseconds");
    });

    it("returns 400 when durationMs is zero or negative", async () => {
      const res = await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs: 0, date: "2024-01-15" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when date is missing", async () => {
      const res = await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs: 5000 }),
      });
      const body = await res.json() as { error: string };

      expect(res.status).toBe(400);
      expect(body.error).toContain("YYYY-MM-DD");
    });

    it("returns 400 when date format is invalid", async () => {
      const res = await fetch(`${baseUrl}/api/time/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs: 5000, date: "15-01-2024" }),
      });

      expect(res.status).toBe(400);
    });
  });
});
