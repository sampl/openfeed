import { describe, it, expect, vi } from "vitest";
import hackerNewsPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_HN_RESPONSE = {
  hits: [
    {
      objectID: "12345",
      title: "Show HN: Something interesting",
      url: "https://example.com/interesting",
      created_at: "2024-01-15T10:00:00.000Z",
      points: 200,
      num_comments: 80,
    },
    {
      objectID: "67890",
      title: "Ask HN: What tools do you use?",
      url: null,
      created_at: "2024-01-15T09:00:00.000Z",
      points: 150,
      num_comments: 120,
    },
  ],
};

describe("hacker-news canHandle", () => {
  it("returns true for news.ycombinator.com", () => {
    expect(hackerNewsPlugin.canHandle("https://news.ycombinator.com")).toBe(true);
    expect(hackerNewsPlugin.canHandle("https://news.ycombinator.com/")).toBe(true);
  });

  it("returns false for non-HN URLs", () => {
    expect(hackerNewsPlugin.canHandle("https://reddit.com")).toBe(false);
    expect(hackerNewsPlugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("hacker-news listItems", () => {
  it("maps hits to feed items with correct fields", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_HN_RESPONSE,
    } as unknown as Response);

    const items = await hackerNewsPlugin.listItems(
      "https://news.ycombinator.com",
      fetchFn
    );

    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.sourceName).toBe("Hacker News");
    expect(first.title).toBe("Show HN: Something interesting");
    expect(first.url).toBe("https://example.com/interesting");
    expect(first.publishedAt).toEqual(new Date("2024-01-15T10:00:00.000Z"));
    expect(first.renderData).toMatchObject({
      richText: { text: "Show HN: Something interesting" },
    });
  });

  it("falls back to HN item URL when hit.url is null", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_HN_RESPONSE,
    } as unknown as Response);

    const items = await hackerNewsPlugin.listItems(
      "https://news.ycombinator.com",
      fetchFn
    );

    const askPost = items[1]!;
    expect(askPost.url).toBe("https://news.ycombinator.com/item?id=67890");
  });

  it("uses limit option in API request", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hits: [] }),
    } as unknown as Response);

    await hackerNewsPlugin.listItems(
      "https://news.ycombinator.com",
      fetchFn,
      { limit: 25 }
    );

    expect(fetchFn.mock.calls[0]?.[0]).toContain("hitsPerPage=25");
  });

  it("defaults to limit 10 when no options provided", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hits: [] }),
    } as unknown as Response);

    await hackerNewsPlugin.listItems("https://news.ycombinator.com", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toContain("hitsPerPage=10");
  });

  it("throws a FeedError with rate_limited on 429 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as unknown as Response);

    const error = await hackerNewsPlugin.listItems("https://news.ycombinator.com", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });

  it("throws a FeedError with network_error on generic HTTP failure", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);

    const error = await hackerNewsPlugin.listItems("https://news.ycombinator.com", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("network_error");
  });
});
