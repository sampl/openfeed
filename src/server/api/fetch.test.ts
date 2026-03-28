// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";

vi.mock("../fetcher.js", () => ({
  runFetch: vi.fn(),
}));

import { runFetch } from "../fetcher.js";
import { createFetchRouter } from "./fetch.js";

const mockRunFetch = runFetch as ReturnType<typeof vi.fn>;

const makeConfig = (): UserConfig => ({
  port: 3000,
  schedule: "0 7 * * *",
  feeds: [],
});

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(),
  upsertItems: vi.fn(),
  updateItemStatus: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRuns: vi.fn(),
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

describe("fetch router", () => {
  let db: DbInterface;
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    db = createMockDb();
    ({ baseUrl, close } = await startTestServer(createFetchRouter(makeConfig(), db), "/api/fetch"));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  it("returns the run ID on success", async () => {
    mockRunFetch.mockResolvedValue("run-abc-123");

    const res = await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    const body = await res.json() as { success: boolean; runId: string };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.runId).toBe("run-abc-123");
  });

  it("triggers runFetch with manual trigger", async () => {
    mockRunFetch.mockResolvedValue("run-xyz");

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    expect(mockRunFetch).toHaveBeenCalledWith(expect.anything(), db, "manual");
  });

  it("returns 500 with a descriptive message when runFetch throws", async () => {
    mockRunFetch.mockRejectedValue(new Error("database locked"));

    const res = await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toContain("database locked");
  });

  it("returns 500 when runFetch throws a non-Error value", async () => {
    mockRunFetch.mockRejectedValue("something went wrong");

    const res = await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
  });
});
