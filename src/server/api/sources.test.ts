// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import type { DbInterface } from "../db/interface.js";
import type { UserConfig } from "../config.js";
import { createSourcesRouter } from "./sources.js";

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(),
  upsertItems: vi.fn(),
  replaceSourceItems: vi.fn(),
  updateItemStatus: vi.fn(),
  expireItems: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRuns: vi.fn(() => []),
  getTimeUsage: vi.fn(),
  recordTimeSession: vi.fn(),
});

const makeConfig = (overrides?: Partial<UserConfig>): UserConfig => ({
  port: 3000,
  schedule: "0 7 * * *",
  feeds: [
    {
      name: "Tech",
      sources: [
        { name: "GitHub", url: "https://github.com/dnd-kit/dnd-kit" },
        { name: "HN", url: "https://news.ycombinator.com" },
      ],
    },
    {
      name: "News",
      sources: [
        { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews" },
      ],
    },
  ],
  ...overrides,
});

const makeRun = (sourceResults = []) => ({
  id: "run-1",
  triggeredBy: "manual" as const,
  startedAt: new Date("2024-01-15T10:00:00Z"),
  completedAt: new Date("2024-01-15T10:01:00Z"),
  status: "success" as const,
  sourceResults,
});

const startTestServer = (config: UserConfig, db: DbInterface) =>
  new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    const app = express();
    app.use("/api/sources", createSourcesRouter(config, db));
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        baseUrl: `http://localhost:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });

describe("sources router", () => {
  let db: DbInterface;
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    db = createMockDb();
    ({ baseUrl, close } = await startTestServer(makeConfig(), db));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  it("returns all configured sources with feedName", async () => {
    const res = await fetch(`${baseUrl}/api/sources`);
    const body = await res.json() as Array<{ name: string; url: string; feedName: string }>;

    expect(res.status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body[0]).toMatchObject({ name: "GitHub", url: "https://github.com/dnd-kit/dnd-kit", feedName: "Tech" });
    expect(body[1]).toMatchObject({ name: "HN", feedName: "Tech" });
    expect(body[2]).toMatchObject({ name: "Reuters", feedName: "News" });
  });

  it("returns sources without last-run data when there are no runs", async () => {
    (db.getRuns as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const res = await fetch(`${baseUrl}/api/sources`);
    const body = await res.json() as Array<{ lastStatus?: string }>;

    expect(res.status).toBe(200);
    body.forEach((source) => {
      expect(source.lastStatus).toBeUndefined();
    });
  });

  it("overlays last-run status on matching sources", async () => {
    const sourceResults = [
      {
        sourceName: "GitHub",
        sourceUrl: "https://github.com/dnd-kit/dnd-kit",
        newItemsCount: 3,
        status: "success" as const,
      },
      {
        sourceName: "HN",
        sourceUrl: "https://news.ycombinator.com",
        newItemsCount: 0,
        status: "error" as const,
        errorMessage: "Failed to fetch feed: HTTP 429",
        errorCode: "rate_limited" as const,
      },
    ];
    (db.getRuns as ReturnType<typeof vi.fn>).mockReturnValue([makeRun(sourceResults)]);

    const res = await fetch(`${baseUrl}/api/sources`);
    const body = await res.json() as Array<{
      name: string;
      lastStatus?: string;
      lastErrorCode?: string;
      lastErrorMessage?: string;
    }>;

    const github = body.find((s) => s.name === "GitHub")!;
    expect(github.lastStatus).toBe("success");
    expect(github.lastErrorCode).toBeUndefined();

    const hn = body.find((s) => s.name === "HN")!;
    expect(hn.lastStatus).toBe("error");
    expect(hn.lastErrorCode).toBe("rate_limited");
    expect(hn.lastErrorMessage).toContain("429");
  });

  it("leaves sources without a matching run result unchanged", async () => {
    const sourceResults = [
      {
        sourceName: "GitHub",
        sourceUrl: "https://github.com/dnd-kit/dnd-kit",
        newItemsCount: 1,
        status: "success" as const,
      },
    ];
    (db.getRuns as ReturnType<typeof vi.fn>).mockReturnValue([makeRun(sourceResults)]);

    const res = await fetch(`${baseUrl}/api/sources`);
    const body = await res.json() as Array<{ name: string; lastStatus?: string }>;

    const reuters = body.find((s) => s.name === "Reuters")!;
    expect(reuters.lastStatus).toBeUndefined();
  });

  it("returns 500 when an unexpected error occurs", async () => {
    (db.getRuns as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("database locked");
    });

    const res = await fetch(`${baseUrl}/api/sources`);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toContain("sources");
  });
});
