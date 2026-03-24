// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbInterface } from "./db/interface.js";
import type { UserConfig } from "./config.js";
import type { NewFeedItem } from "../plugins/types.js";
import { FeedError } from "../plugins/types.js";

vi.mock("./pluginRegistry.js", () => ({
  resolvePlugin: vi.fn(),
}));

import { resolvePlugin } from "./pluginRegistry.js";
import { runFetch } from "./fetcher.js";

const createMockDb = (): DbInterface => ({
  getItems: vi.fn(),
  upsertItems: vi.fn(() => 2),
  replaceSourceItems: vi.fn(() => 1),
  updateItemStatus: vi.fn(),
  createRun: vi.fn(() => "run-123"),
  updateRun: vi.fn(),
  getRuns: vi.fn(),
});

const makeSource = (overrides = {}) => ({
  name: "Test Source",
  url: "https://example.com/feed",
  ...overrides,
});

const makeFeedItem = (overrides: Partial<NewFeedItem> = {}): NewFeedItem => ({
  sourceName: "Test Source",
  sourceUrl: "https://example.com/feed",
  title: "Test Item",
  url: "https://example.com/item-1",
  publishedAt: new Date("2024-01-01T00:00:00Z"),
  renderData: { richText: { text: "content" } },
  ...overrides,
});

const makePlugin = (name: string, items: NewFeedItem[] = [makeFeedItem()]) => ({
  name,
  canHandle: vi.fn(() => true),
  listItems: vi.fn(async () => items),
});

const makeConfig = (sources = [makeSource()]): UserConfig => ({
  port: 3000,
  schedule: "0 7 * * *",
  feeds: [{ name: "Main", sources }],
});

const mockResolvePlugin = resolvePlugin as ReturnType<typeof vi.fn>;

describe("runFetch", () => {
  let db: DbInterface;

  beforeEach(() => {
    db = createMockDb();
    vi.clearAllMocks();
  });

  it("calls plugin.listItems for each source", async () => {
    const plugin = makePlugin("rss");
    mockResolvePlugin.mockReturnValue(plugin);

    const config = makeConfig([makeSource(), makeSource({ url: "https://example.com/other" })]);
    await runFetch(config, db, "manual");

    expect(plugin.listItems).toHaveBeenCalledTimes(2);
  });

  it("uses upsertItems for append mode sources", async () => {
    const plugin = makePlugin("rss");
    mockResolvePlugin.mockReturnValue(plugin);

    const config = makeConfig([makeSource({ fetchMode: "append" })]);
    await runFetch(config, db, "manual");

    expect(db.upsertItems).toHaveBeenCalledOnce();
    expect(db.replaceSourceItems).not.toHaveBeenCalled();
  });

  it("uses replaceSourceItems for replace mode sources", async () => {
    const plugin = makePlugin("rss");
    mockResolvePlugin.mockReturnValue(plugin);

    const config = makeConfig([makeSource({ fetchMode: "replace" })]);
    await runFetch(config, db, "manual");

    expect(db.replaceSourceItems).toHaveBeenCalledOnce();
    expect(db.upsertItems).not.toHaveBeenCalled();
  });

  it("records error in sourceResults when plugin.listItems throws", async () => {
    const plugin = {
      name: "rss",
      canHandle: vi.fn(() => true),
      listItems: vi.fn(async () => {
        throw new Error("network failure");
      }),
    };
    mockResolvePlugin.mockReturnValue(plugin);

    await runFetch(makeConfig(), db, "manual");

    const updateRunCall = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0];
    const updateArgs = updateRunCall[1];
    expect(updateArgs.sourceResults[0].status).toBe("error");
    expect(updateArgs.sourceResults[0].errorMessage).toBe("network failure");
  });

  it("captures errorCode 'unknown' when plugin throws a plain Error", async () => {
    const plugin = {
      name: "rss",
      canHandle: vi.fn(() => true),
      listItems: vi.fn(async () => { throw new Error("plain error"); }),
    };
    mockResolvePlugin.mockReturnValue(plugin);

    await runFetch(makeConfig(), db, "manual");

    const updateArgs = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updateArgs.sourceResults[0].errorCode).toBe("unknown");
  });

  it("captures structured errorCode when plugin throws a FeedError", async () => {
    const plugin = {
      name: "rss",
      canHandle: vi.fn(() => true),
      listItems: vi.fn(async () => { throw new FeedError("rate limited", "rate_limited"); }),
    };
    mockResolvePlugin.mockReturnValue(plugin);

    await runFetch(makeConfig(), db, "manual");

    const updateArgs = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updateArgs.sourceResults[0].errorCode).toBe("rate_limited");
    expect(updateArgs.sourceResults[0].errorMessage).toBe("rate limited");
  });

  it("captures 'missing_credential' code from FeedError", async () => {
    const plugin = {
      name: "instagram",
      canHandle: vi.fn(() => true),
      listItems: vi.fn(async () => { throw new FeedError("API key missing", "missing_credential"); }),
    };
    mockResolvePlugin.mockReturnValue(plugin);

    await runFetch(makeConfig(), db, "manual");

    const updateArgs = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updateArgs.sourceResults[0].errorCode).toBe("missing_credential");
  });

  it("updates run with success status when all sources succeed", async () => {
    mockResolvePlugin.mockReturnValue(makePlugin("rss"));

    await runFetch(makeConfig(), db, "manual");

    const updateRunCall = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateRunCall[1].status).toBe("success");
  });

  it("updates run with error status when any source fails", async () => {
    const plugin = {
      name: "rss",
      canHandle: vi.fn(() => true),
      listItems: vi.fn(async () => {
        throw new Error("fetch failed");
      }),
    };
    mockResolvePlugin.mockReturnValue(plugin);

    await runFetch(makeConfig(), db, "manual");

    const updateRunCall = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateRunCall[1].status).toBe("error");
  });

  it("passes source.plugin to resolvePlugin as the second argument", async () => {
    const plugin = makePlugin("rss");
    mockResolvePlugin.mockReturnValue(plugin);

    const source = makeSource({ url: "https://example.com", plugin: "rss" });
    await runFetch(makeConfig([source]), db, "manual");

    expect(mockResolvePlugin).toHaveBeenCalledWith("https://example.com", "rss");
  });

  it("passes undefined plugin to resolvePlugin when source has no plugin field", async () => {
    const plugin = makePlugin("rss");
    mockResolvePlugin.mockReturnValue(plugin);

    const source = makeSource({ url: "https://example.com/feed.xml" });
    await runFetch(makeConfig([source]), db, "manual");

    expect(mockResolvePlugin).toHaveBeenCalledWith("https://example.com/feed.xml", undefined);
  });

  it("skips sources where plugin name is 'default'", async () => {
    const defaultPlugin = makePlugin("default");
    mockResolvePlugin.mockReturnValue(defaultPlugin);

    await runFetch(makeConfig(), db, "manual");

    expect(defaultPlugin.listItems).not.toHaveBeenCalled();
    expect(db.upsertItems).not.toHaveBeenCalled();
    expect(db.replaceSourceItems).not.toHaveBeenCalled();

    const updateRunCall = (db.updateRun as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateRunCall[1].sourceResults[0].status).toBe("skipped");
  });
});
