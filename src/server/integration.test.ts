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
 *   POST /api/fetch  →  fetcher runs plugins, stores items
 *   GET  /api/items  →  returns stored items
 *   GET  /api/runs   →  returns run history with source results
 *   GET  /api/sources →  returns sources with last-run status
 *   PATCH /api/items/:id →  updates item status
 *   GET  /api/feeds  →  returns configured feeds
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer as createHttpServer } from "http";
import type { AddressInfo } from "net";
import { createSqliteDb } from "./db/sqlite.js";
import { createServer as createExpressApp } from "./server.js";
import type { NewFeedItem } from "../plugins/types.js";
import { FeedError } from "../plugins/types.js";
import {
  SAMPLE_HN_RESPONSE,
  SAMPLE_GITHUB_ISSUES_RESPONSE,
  SAMPLE_BLUESKY_RESPONSE,
} from "../plugins/__fixtures__/index.ts";

// ─── Plugin registry mock ─────────────────────────────────────────────────────

vi.mock("./pluginRegistry.js", () => ({ resolvePlugin: vi.fn() }));
import { resolvePlugin } from "./pluginRegistry.js";
const mockResolvePlugin = resolvePlugin as ReturnType<typeof vi.fn>;

// Set a safe default so calls from the items router (which resolves plugin icons
// per-item on GET /api/items) never receive undefined after mockReturnValueOnce
// values set up for runFetch are exhausted.
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

/** Build a fake NewFeedItem with sensible defaults.
 * Uses a recent publishedAt so items are not filtered by the default maxAgeDays=30. */
const makeFeedItem = (overrides: Partial<NewFeedItem> = {}): NewFeedItem => ({
  sourceName: "Hacker News",
  sourceUrl: "https://news.ycombinator.com",
  title: "Test Item",
  url: `https://example.com/item-${Math.random().toString(36).slice(2)}`,
  publishedAt: new Date(), // Use current time so items pass the maxAgeDays filter
  renderData: { richText: { text: "Test content" } },
  ...overrides,
});

/** Build a fake plugin whose listItems resolves with the supplied items. */
const makePlugin = (name: string, items: NewFeedItem[]) => ({
  name,
  canHandle: vi.fn(() => true),
  listItems: vi.fn(async () => items),
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

describe("Integration: successful fetch populates the items endpoint", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("POST /api/fetch stores items and GET /api/items returns them", async () => {
    const hnItem = makeFeedItem({ title: "Show HN: Something cool", url: "https://news.ycombinator.com/item?id=1" });
    const ghItem = makeFeedItem({
      sourceName: "GitHub",
      sourceUrl: "https://github.com/sampl/openfeed",
      title: "Fix the bug",
      url: "https://github.com/sampl/openfeed/issues/42",
    });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [hnItem]))
      .mockReturnValueOnce(makePlugin("github", [ghItem]));

    const fetchRes = await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    expect(fetchRes.status).toBe(200);
    const { success, runId } = await fetchRes.json() as { success: boolean; runId: string };
    expect(success).toBe(true);
    expect(typeof runId).toBe("string");

    const itemsRes = await fetch(`${baseUrl}/api/items`);
    expect(itemsRes.status).toBe(200);
    const { items } = await itemsRes.json() as { items: Array<{ title: string }> };
    const titles = items.map((i) => i.title);
    expect(titles).toContain("Show HN: Something cool");
    expect(titles).toContain("Fix the bug");
  });

  it("GET /api/runs shows a successful run with source results after fetch", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [makeFeedItem()]))
      .mockReturnValueOnce(makePlugin("github", [makeFeedItem({ url: "https://github.com/item-2" })]));

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

  it("run status is error and errorCode is rate_limited; no items stored", async () => {
    const rateLimitedPlugin = makeErrorPlugin(
      "hacker-news",
      new FeedError("Failed to fetch feed: HTTP 429", "rate_limited")
    );
    const successPlugin = makePlugin("github", [
      makeFeedItem({ url: "https://github.com/item-ok", sourceName: "GitHub", sourceUrl: "https://github.com/sampl/openfeed" }),
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

    // GitHub item should still appear
    const itemsRes = await fetch(`${baseUrl}/api/items`);
    const { items } = await itemsRes.json() as { items: unknown[] };
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

  it("stores items only from the successful source", async () => {
    const hnItems = [
      makeFeedItem({ title: "HN Post 1", url: "https://hn.example.com/1" }),
      makeFeedItem({ title: "HN Post 2", url: "https://hn.example.com/2" }),
    ];

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", hnItems))
      .mockReturnValueOnce(makeErrorPlugin("github", new FeedError("Not found", "source_not_found")));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const itemsRes = await fetch(`${baseUrl}/api/items`);
    const { items } = await itemsRes.json() as { items: Array<{ title: string }> };
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.title)).toContain("HN Post 1");
    expect(items.map((i) => i.title)).toContain("HN Post 2");
  });

  it("run has one success and one error in sourceResults", async () => {
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [makeFeedItem()]))
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

describe("Integration: multiple sequential fetches deduplicate items", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("items with the same URL are not duplicated across two fetches", async () => {
    const stableUrl = "https://hn.example.com/stable-item";
    const item = makeFeedItem({ title: "Stable Item", url: stableUrl });

    // Two fetches, same item URL both times
    mockResolvePlugin
      .mockReturnValue(makePlugin("hacker-news", [item]));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const itemsRes = await fetch(`${baseUrl}/api/items`);
    const { items } = await itemsRes.json() as { items: unknown[] };
    // Item is stored only once despite two fetches
    expect(items).toHaveLength(1);

    // But two runs are recorded
    const runsRes = await fetch(`${baseUrl}/api/runs`);
    const runs = await runsRes.json() as unknown[];
    expect(runs).toHaveLength(2);
  });

  it("new items from subsequent fetches are added alongside existing ones", async () => {
    const item1 = makeFeedItem({ title: "First Fetch Item", url: "https://hn.example.com/item-1" });
    const item2 = makeFeedItem({ title: "Second Fetch Item", url: "https://hn.example.com/item-2" });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [item1]))
      .mockReturnValueOnce(makePlugin("github", []))
      .mockReturnValueOnce(makePlugin("hacker-news", [item1, item2]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });
    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const itemsRes = await fetch(`${baseUrl}/api/items`);
    const { items } = await itemsRes.json() as { items: Array<{ title: string }> };
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.title)).toContain("First Fetch Item");
    expect(items.map((i) => i.title)).toContain("Second Fetch Item");
  });
});

describe("Integration: item status update flow", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("PATCH /api/items/:id moves item from unread to archived", async () => {
    const item = makeFeedItem({ title: "Archivable Item", url: "https://hn.example.com/archive-me" });
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [item]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    // Get the stored item's id
    const unreadRes = await fetch(`${baseUrl}/api/items?status=unread`);
    const { items: unreadItems } = await unreadRes.json() as { items: Array<{ id: string; title: string }> };
    const stored = unreadItems.find((i) => i.title === "Archivable Item")!;
    expect(stored).toBeDefined();

    // Archive it
    const patchRes = await fetch(`${baseUrl}/api/items/${stored.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    expect(patchRes.status).toBe(200);

    // Verify it no longer appears in unread
    const unreadAfter = await fetch(`${baseUrl}/api/items?status=unread`);
    const { items: remaining } = await unreadAfter.json() as { items: Array<{ id: string }> };
    expect(remaining.every((i) => i.id !== stored.id)).toBe(true);

    // Verify it appears in archived
    const archivedRes = await fetch(`${baseUrl}/api/items?status=archived`);
    const { items: archived } = await archivedRes.json() as { items: Array<{ id: string }> };
    expect(archived.some((i) => i.id === stored.id)).toBe(true);
  });

  it("PATCH /api/items/:id returns 400 for invalid status", async () => {
    const res = await fetch(`${baseUrl}/api/items/some-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });
    expect(res.status).toBe(400);
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
      .mockReturnValueOnce(makePlugin("hacker-news", [makeFeedItem()]))
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

    const itemsRes = await fetch(`${baseUrl}/api/items`);
    const { items } = await itemsRes.json() as { items: unknown[] };
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

  it("items from SAMPLE_HN_RESPONSE fixture are stored and retrievable", async () => {
    // Build items that mirror what the real HN plugin would return from SAMPLE_HN_RESPONSE.
    // Use new Date() for publishedAt so items pass the default maxAgeDays=30 filter.
    const hnItems: NewFeedItem[] = SAMPLE_HN_RESPONSE.hits.map((hit) => ({
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com",
      title: hit.title,
      url: hit.url,
      publishedAt: new Date(), // recent date so items aren't filtered out
      renderData: {
        richText: { text: `${hit.points} points, ${hit.num_comments} comments` },
      },
    }));

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", hnItems))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/items`);
    const { items } = await res.json() as { items: Array<{ title: string; url: string }> };
    expect(items[0]!.title).toBe("Show HN: Something interesting");
    expect(items[0]!.url).toBe("https://example.com/interesting");
  });

  it("items from SAMPLE_GITHUB_ISSUES_RESPONSE fixture are stored and retrievable", async () => {
    const ghItems: NewFeedItem[] = SAMPLE_GITHUB_ISSUES_RESPONSE.map((issue) => ({
      sourceName: "GitHub",
      sourceUrl: "https://github.com/sampl/openfeed",
      title: `#${issue.number} ${issue.title}`,
      url: issue.html_url,
      publishedAt: new Date(), // recent date so items aren't filtered out
      renderData: { richText: { text: issue.body ?? "" } },
    }));

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", []))
      .mockReturnValueOnce(makePlugin("github", ghItems));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/items`);
    const { items } = await res.json() as { items: Array<{ title: string }> };
    expect(items[0]!.title).toBe("#42 Fix the thing");
  });

  it("items from SAMPLE_BLUESKY_RESPONSE fixture have correct sourceNames", async () => {
    const bskyItems: NewFeedItem[] = SAMPLE_BLUESKY_RESPONSE.feed.map((entry) => {
      const rkey = entry.post.uri.split("/").pop() ?? "";
      return {
        sourceName: "Bluesky",
        sourceUrl: "https://bsky.app/profile/user.bsky.social",
        title: entry.post.record.text.slice(0, 80),
        url: `https://bsky.app/profile/${entry.post.author.handle}/post/${rkey}`,
        publishedAt: new Date(), // recent date so items aren't filtered out
        renderData: { richText: { text: entry.post.record.text } },
      };
    });

    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("bluesky", bskyItems))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const res = await fetch(`${baseUrl}/api/items`);
    const { items } = await res.json() as { items: Array<{ title: string }> };
    expect(items[0]!.title).toContain("Hello from Bluesky");
  });
});

describe("Integration: feed filter on GET /api/items", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ baseUrl, close } = await startServer());
  });

  afterEach(async () => {
    await close();
  });

  it("returns only items belonging to the requested feed", async () => {
    const hnItem = makeFeedItem({ title: "HN Post", url: "https://hn.example.com/post" });

    // Both sources are in the "Tech" feed; after fetch, filter by feedName
    mockResolvePlugin
      .mockReturnValueOnce(makePlugin("hacker-news", [hnItem]))
      .mockReturnValueOnce(makePlugin("github", []));

    await fetch(`${baseUrl}/api/fetch`, { method: "POST" });

    const techRes = await fetch(`${baseUrl}/api/items?feed=Tech`);
    const { items: techItems } = await techRes.json() as { items: unknown[] };
    expect(techItems).toHaveLength(1);

    const unknownFeedRes = await fetch(`${baseUrl}/api/items?feed=NonExistent`);
    const { items: noItems } = await unknownFeedRes.json() as { items: unknown[] };
    expect(noItems).toHaveLength(0);
  });
});
