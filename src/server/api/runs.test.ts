// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import type { DbInterface } from "../db/interface.js";
import { createRunsRouter } from "./runs.js";

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(),
  upsertItems: vi.fn(),
  updateItemStatus: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRuns: vi.fn(() => []),
  getTimeUsage: vi.fn(),
  recordTimeSession: vi.fn(),
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

const makeRun = (id: string) => ({
  id,
  triggeredBy: "manual" as const,
  startedAt: "2024-01-01T00:00:00Z",
  completedAt: "2024-01-01T00:01:00Z",
  status: "success" as const,
  sourceResults: [],
});

describe("runs router", () => {
  let db: DbInterface;
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    db = createMockDb();
    ({ baseUrl, close } = await startTestServer(createRunsRouter(db), "/api/runs"));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  it("returns the list of runs from the database", async () => {
    const mockRuns = [makeRun("run-1"), makeRun("run-2")];
    (db.getRuns as ReturnType<typeof vi.fn>).mockReturnValue(mockRuns);

    const res = await fetch(`${baseUrl}/api/runs`);
    const body = await res.json() as unknown[];

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect((body[0] as { id: string }).id).toBe("run-1");
  });

  it("uses a default limit of 50", async () => {
    await fetch(`${baseUrl}/api/runs`);
    expect(db.getRuns).toHaveBeenCalledWith(50);
  });

  it("passes a custom limit when provided", async () => {
    await fetch(`${baseUrl}/api/runs?limit=10`);
    expect(db.getRuns).toHaveBeenCalledWith(10);
  });

  it("caps limit at 200", async () => {
    await fetch(`${baseUrl}/api/runs?limit=9999`);
    expect(db.getRuns).toHaveBeenCalledWith(200);
  });

  it("returns 500 with a descriptive message when the database throws", async () => {
    (db.getRuns as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("disk I/O error");
    });

    const res = await fetch(`${baseUrl}/api/runs`);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toContain("Could not load fetch history");
  });
});
