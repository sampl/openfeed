// @vitest-environment node
/**
 * Integration tests for the OpenFeed API server.
 *
 * Uses a real in-memory SQLite database and a real Express HTTP server with
 * all routes mounted. External HTTP calls are prevented by mocking
 * resolvePlugin to return fake plugins whose listItems functions return
 * fixture data or throw FeedErrors.
 *
 * These tests verify end-to-end behaviour:
 *   POST /api/fetch     →  fetcher runs plugins, stores objects
 *   GET  /api/objects   →  returns stored objects
 *   GET  /api/runs      →  returns run history with source results
 *   GET  /api/sources   →  returns sources with last-run status
 *   POST /api/activities →  creates Read/Add activity for an object
 *   GET  /api/feeds     →  returns configured feeds
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer as createHttpServer } from "http";
import type { AddressInfo } from "net";
import { createSqliteDb } from "./db/sqlite.js";
import { createServer as createExpressApp } from "./server.js";
import type { PluginAS2Object } from "../connectors/types.js";
import { FeedError } from "../connectors/types.js";
import {
  SAMPLE_HN_RESPONSE,
  SAMPLE_GITHUB_ISSUES_RESPONSE,
  SAMPLE_BLUESKY_RESPONSE,
} from "../connectors/__fixtures__/index.ts";

// ─── Plugin registry mock ─────────────────────────────────────────────────────

vi.mock("./pluginRegistry.js", () => ({ resolvePlugin: vi.fn() }));
import { resolvePlugin } from "./pluginRegistry.js";
const mockResolvePlugin = resolvePlugin as ReturnType<typeof vi.fn>;

// Set a safe default so calls from the objects router (which resolves plugin
// icons per-object) never receive undefined after mockReturnValueOnce values
// set up for runFetch are exhausted.
beforeEach(() => {
  mockResolvePlugin.mockReturnValue({ name: "rss", icon: undefined });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal user config with two sources in a single feed. */
const makeConfig = () => ({
  port: 0,
  schedule: "0 0 31 2 *", // never fires
  feeds: [
    {
      name: "Tech",
      sources: [
        { name: "Hacker News", url: "https://news.ycombinator.com" },
        { name: "GitHub", url: "https://github.com/sampl/openfeed" },
      ],
    },
  ],
});

/**
 * Build a fake PluginAS2Object with sensible defaults.
 * Uses a recent published date so objects are not filtered by the default maxAgeDays=30.
 */
const makePluginObject = (overrides: Partial<PluginAS2Object> = {}): PluginAS2Object => ({
  type: "Article",
  name: "Test Item",
  url: `https://example.com/item-${Math.random().toString(36).slice(2)}`,
  published: new Date(), // Use current time so objects pass the maxAgeDays filter
  content: "Test content",
  ...overrides,
});

/** Build a fake plugin whose listItems resolves with the supplied objects. */
const makePlugin = (name: string, objects: PluginAS2Object[]) => ({
  name,
  canHandle: vi.fn(() => true),
  listItems: vi.fn(async () => objects),
});

/** Build a fake plugin whose listItems throws the supplied error. */
const makeErrorPlugin = (name: string, error: Error) => ({
  name,
  canHandle: vi.fn(() => true),
  listItems: vi.fn(async () => { throw error; }),
});

/** Start the full Express app on a random port. Returns baseUrl + cleanup fn. */
const startServer = async () => {
  const db = createSqliteDb(":memory:");
  const config = makeConfig();
  const app = createExpressApp(config, db, "/tmp/non-existent-config.yaml");
  const httpServer = createHttpServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  return {
    db,
    config,
    baseUrl: `http://localhost:${port}`,
    close: () => new Promise<void>((res) => httpServer.close(() => res())),
  };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Integration: successful fetch populates the objects endpoint", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("POST /api/fetch stores objects and GET /api/objects returns them", async () => {
    const hnObj = makePluginObject({ name: "Show HN: Something cool", url: "https://news.ycombinator.com/item?id=1" });
    const ghObj = makePluginObject({
      name: "Fix the bug",
      url: "https://github.com/sampl/openfeed/issues/42",
    });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [hnObj]))
      .mockReturnValueOnce(makePlugin("github", [ghObj]));

    const fetchRes = await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    expect(fetchRes.status).toBe(200);
    const { success, runId } = await fetchRes.json() as { success: boolean; runId: string };
    expect(success).toBe(true);
    expect(typeof runId).toBe("string");

    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    expect(objectsRes.status).toBe(200);
    const { items } = await objectsRes.json() as { items: Array<{ name: string }> };
    const names = items.map((i) => i.name);
    expect(names).toContain("Show HN: Something cool");
    expect(names).toContain("Fix the bug");
  });

  it("GET /api/runs shows a successful run with source results after fetch", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [makePluginObject()]))
      .mockReturnValueOnce(makePlugin("github", [makePluginObject({ url: "https://github.com/item-2" })]));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const runsRes = await fetch(`${baseUrl}/api/runs`);
    expect(runsRes.status).toBe(200);
    const runs = await runsRes.json() as Array<{
      status: string;
      sourceResults: Array<{ sourceName: string; status: string; newItemsCount: number }>;
    }>;

    expect(runs).toHaveLength(1);
    expect(runs[0]!.status).toBe("success");
    expect(runs[0]!.sourceResults).toHaveLength(2);
    expect(runs[0]!.sourceResults[0]!.status).toBe("success");
    expect(runs[0]!.sourceResults[0]!.newItemsCount).toBe(1);
  });

  it("GET /api/feeds returns the configured feeds", async () => {
    const res = await fetch(`${baseUrl}/api/feeds`);
    expect(res.status).toBe(200);
    const feeds = await res.json() as Array<{ name: string }>;
    expect(feeds.some((f) => f.name === "Tech")).toBe(true);
  });

  it("GET /api/sources returns all configured sources", async () => {
    const res = await fetch(`${baseUrl}/api/sources`);
    expect(res.status).toBe(200);
    const sources = await res.json() as Array<{ name: string; feedName: string }>;
    expect(sources).toHaveLength(2);
    expect(sources.some((s) => s.name === "Hacker News")).toBe(true);
    expect(sources.some((s) => s.name === "GitHub")).toBe(true);
  });
});

describe("Integration: rate-limited source records error in run", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("run status is error and errorCode is rate_limited; no objects stored for that source", async () => {
    const rateLimitedPlugin = makeErrorPlugin(
      "hacker-news",
      new FeedError("Failed to fetch feed: HTTP 429", "rate_limited")
    );
    const successPlugin = makePlugin("github", [
      makePluginObject({ url: "https://github.com/item-ok" }),
    ]);

    // HN is rate-limited; GitHub succeeds
    mockResolvePlugin
      .mockReturnValueOnce(rateLimitedPlugin)
      .mockReturnValueOnce(successPlugin);

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const runsRes = await fetch(`${baseUrl}/api/runs`);
    const runs = await runsRes.json() as Array<{
      status: string;
      sourceResults: Array<{ sourceName: string; status: string; errorCode?: string }>;
    }>;

    expect(runs[0]!.status).toBe("error");
    const hnResult = runs[0]!.sourceResults.find((r) => r.sourceName === "Hacker News");
    expect(hnResult!.status).toBe("error");
    expect(hnResult!.errorCode).toBe("rate_limited");

    // GitHub object should still appear
    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    const { items } = await objectsRes.json() as { items: unknown[] };
    expect(items).toHaveLength(1);
  });
});

describe("Integration: mixed success and failure across two sources", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("stores objects only from the successful source", async () => {
    const hnObjects = [
      makePluginObject({ name: "HN Post 1", url: "https://hn.example.com/1" }),
      makePluginObject({ name: "HN Post 2", url: "https://hn.example.com/2" }),
    ];

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", hnObjects))
      .mockReturnValueOnce(makeErrorPlugin("github", new FeedError("Not found", "source_not_found")));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    const { items } = await objectsRes.json() as { items: Array<{ name: string }> };
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toContain("HN Post 1");
    expect(items.map((i) => i.name)).toContain("HN Post 2");
  });

  it("run has one success and one error in sourceResults", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [makePluginObject()]))
      .mockReturnValueOnce(makeErrorPlugin("github", new FeedError("Auth required", "auth_error")));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const runsRes = await fetch(`${baseUrl}/api/runs`);
    const runs = await runsRes.json() as Array<{
      sourceResults: Array<{ sourceName: string; status: string; errorCode?: string }>;
    }>;
    const results = runs[0]!.sourceResults;
    const hn = results.find((r) => r.sourceName === "Hacker News")!;
    const gh = results.find((r) => r.sourceName === "GitHub")!;
    expect(hn.status).toBe("success");
    expect(gh.status).toBe("error");
    expect(gh.errorCode).toBe("auth_error");
  });
});

describe("Integration: multiple sequential fetches deduplicate objects", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("objects with the same URL are not duplicated across two fetches", async () => {
    const stableUrl = "https://hn.example.com/stable-item";
    const obj = makePluginObject({ name: "Stable Item", url: stableUrl });

    // Two fetches, same object URL both times
    mockResolvePlugin
      .mockReturnValue(makePlugin("hacker-news", [obj]));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    const { items } = await objectsRes.json() as { items: unknown[] };
    // Object is stored only once despite two fetches
    expect(items).toHaveLength(1);

    // But two runs are recorded
    const runsRes = await fetch(`${baseUrl}/api/runs`);
    const runs = await runsRes.json() as unknown[];
    expect(runs).toHaveLength(2);
  });

  it("new objects from subsequent fetches are added alongside existing ones", async () => {
    const obj1 = makePluginObject({ name: "First Fetch Item", url: "https://hn.example.com/item-1" });
    const obj2 = makePluginObject({ name: "Second Fetch Item", url: "https://hn.example.com/item-2" });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [obj1]))
      .mockReturnValueOnce(makePlugin("github", []))
      .mockReturnValueOnce(makePlugin("hacker-news", [obj1, obj2]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    const { items } = await objectsRes.json() as { items: Array<{ name: string }> };
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toContain("First Fetch Item");
    expect(items.map((i) => i.name)).toContain("Second Fetch Item");
  });
});

describe("Integration: activity creation flow", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("POST /api/activities with type=Read removes object from unread view", async () => {
    const obj = makePluginObject({ name: "Readable Item", url: "https://hn.example.com/read-me" });
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [obj]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    // Get the stored object's id from the unread view
    const unreadRes = await fetch(`${baseUrl}/api/objects?view=unread`);
    const { items: unreadItems } = await unreadRes.json() as { items: Array<{ id: string; name: string }> };
    const stored = unreadItems.find((i) => i.name === "Readable Item")!;
    expect(stored).toBeDefined();

    // Mark it as Read
    const actRes = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Read", objectId: stored.id }),
    });
    expect(actRes.status).toBe(201);

    // Verify it no longer appears in unread
    const unreadAfter = await fetch(`${baseUrl}/api/objects?view=unread`);
    const { items: remaining } = await unreadAfter.json() as { items: Array<{ id: string }> };
    expect(remaining.every((i) => i.id !== stored.id)).toBe(true);
  });

  it("POST /api/activities with type=Add saves object to saved view", async () => {
    const obj = makePluginObject({ name: "Saveable Item", url: "https://hn.example.com/save-me" });
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [obj]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const allRes = await fetch(`${baseUrl}/api/objects?view=all`);
    const { items } = await allRes.json() as { items: Array<{ id: string; name: string }> };
    const stored = items.find((i) => i.name === "Saveable Item")!;
    expect(stored).toBeDefined();

    // Add it to saved
    const actRes = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Add", objectId: stored.id, target: { type: "Collection", name: "read-later" } }),
    });
    expect(actRes.status).toBe(201);

    // Verify it appears in saved view
    const savedRes = await fetch(`${baseUrl}/api/objects?view=saved`);
    const { items: savedItems } = await savedRes.json() as { items: Array<{ id: string }> };
    expect(savedItems.some((i) => i.id === stored.id)).toBe(true);
  });

  it("POST /api/activities returns 400 for invalid type", async () => {
    const res = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Delete", objectId: "some-id" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/activities returns 404 for unknown objectId", async () => {
    const res = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Read", objectId: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/activities returns 409 when Read activity already exists", async () => {
    const obj = makePluginObject({ name: "Already Read", url: "https://hn.example.com/already-read" });
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [obj]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const allRes = await fetch(`${baseUrl}/api/objects?view=all`);
    const { items } = await allRes.json() as { items: Array<{ id: string; name: string }> };
    const stored = items.find((i) => i.name === "Already Read")!;

    // First Read — succeeds
    await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Read", objectId: stored.id }),
    });

    // Second Read — conflict
    const conflictRes = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Read", objectId: stored.id }),
    });
    expect(conflictRes.status).toBe(409);
  });
});

describe("Integration: sources endpoint reflects last-run status", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("sources show success and error status after a mixed fetch", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [makePluginObject()]))
      .mockReturnValueOnce(makeErrorPlugin("github", new FeedError("Rate limited", "rate_limited")));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const sourcesRes = await fetch(`${baseUrl}/api/sources`);
    const sources = await sourcesRes.json() as Array<{
      name: string;
      lastStatus?: string;
      lastErrorCode?: string;
    }>;

    const hn = sources.find((s) => s.name === "Hacker News")!;
    const gh = sources.find((s) => s.name === "GitHub")!;
    expect(hn.lastStatus).toBe("success");
    expect(gh.lastStatus).toBe("error");
    expect(gh.lastErrorCode).toBe("rate_limited");
  });

  it("sources show no lastStatus before any fetch has run", async () => {
    const sourcesRes = await fetch(`${baseUrl}/api/sources`);
    const sources = await sourcesRes.json() as Array<{ lastStatus?: string }>;
    sources.forEach((s) => {
      expect(s.lastStatus).toBeUndefined();
    });
  });
});

describe("Integration: network error is captured in run", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("network_error code is persisted in source result", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makeErrorPlugin("hacker-news", new FeedError("Connection refused", "network_error")))
      .mockReturnValueOnce(makeErrorPlugin("github", new FeedError("Connection refused", "network_error")));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const runsRes = await fetch(`${baseUrl}/api/runs`);
    const runs = await runsRes.json() as Array<{
      status: string;
      sourceResults: Array<{ errorCode?: string }>;
    }>;

    expect(runs[0]!.status).toBe("error");
    runs[0]!.sourceResults.forEach((r) => {
      expect(r.errorCode).toBe("network_error");
    });

    const objectsRes = await fetch(`${baseUrl}/api/objects`);
    const { items } = await objectsRes.json() as { items: unknown[] };
    expect(items).toHaveLength(0);
  });
});

describe("Integration: fixture-driven fetch scenarios", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("objects from SAMPLE_HN_RESPONSE fixture are stored and retrievable", async () => {
    // Build objects that mirror what the real HN plugin would return from SAMPLE_HN_RESPONSE.
    const hnObjects: PluginAS2Object[] = SAMPLE_HN_RESPONSE.hits.map((hit) => ({
      type: "Article" as const,
      name: hit.title,
      url: hit.url,
      published: new Date(), // recent date so objects aren't filtered out
      content: `${hit.points} points, ${hit.num_comments} comments`,
    }));

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", hnObjects))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/objects`);
    const { items } = await res.json() as { items: Array<{ name: string; url: string }> };
    expect(items[0]!.name).toBe("Show HN: Something interesting");
    expect(items[0]!.url).toBe("https://example.com/interesting");
  });

  it("objects from SAMPLE_GITHUB_ISSUES_RESPONSE fixture are stored and retrievable", async () => {
    const ghObjects: PluginAS2Object[] = SAMPLE_GITHUB_ISSUES_RESPONSE.map((issue) => ({
      type: "Article" as const,
      name: `#${issue.number} ${issue.title}`,
      url: issue.html_url,
      published: new Date(), // recent date so objects aren't filtered out
      content: issue.body ?? "",
    }));

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", []))
      .mockReturnValueOnce(makePlugin("github", ghObjects));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/objects`);
    const { items } = await res.json() as { items: Array<{ name: string }> };
    expect(items[0]!.name).toBe("#42 Fix the thing");
  });

  it("objects from SAMPLE_BLUESKY_RESPONSE fixture have correct sourceName", async () => {
    const bskyObjects: PluginAS2Object[] = SAMPLE_BLUESKY_RESPONSE.feed.map((entry) => {
      const rkey = entry.post.uri.split("/").pop() ?? "";
      return {
        type: "Note" as const,
        content: entry.post.record.text,
        summary: entry.post.record.text.slice(0, 200),
        url: `https://bsky.app/profile/${entry.post.author.handle}/post/${rkey}`,
        published: new Date(), // recent date so objects aren't filtered out
      };
    });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("bluesky", bskyObjects))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/objects`);
    const { items } = await res.json() as { items: Array<{ content: string; sourceName: string }> };
    expect(items[0]!.content).toContain("Hello from Bluesky");
    expect(items[0]!.sourceName).toBe("Hacker News"); // sourceName comes from config (first source in "Tech" feed)
  });
});

describe("Integration: feed filter on GET /api/objects", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("returns only objects belonging to the requested feed", async () => {
    const hnObj = makePluginObject({ name: "HN Post", url: "https://hn.example.com/post" });

    // Both sources are in the "Tech" feed; after fetch, filter by feedName
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [hnObj]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const techRes = await fetch(`${baseUrl}/api/objects?feed=Tech`);
    const { items: techItems } = await techRes.json() as { items: unknown[] };
    expect(techItems).toHaveLength(1);

    const unknownFeedRes = await fetch(`${baseUrl}/api/objects?feed=NonExistent`);
    const { items: noItems } = await unknownFeedRes.json() as { items: unknown[] };
    expect(noItems).toHaveLength(0);
  });
});
