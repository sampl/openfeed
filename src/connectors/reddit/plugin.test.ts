import { describe, it, expect, vi } from "vitest";
import redditPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_REDDIT_RESPONSE = {
  data: {
    children: [
      {
        data: {
          id: "abc123",
          title: "Cool post about Brooklyn",
          selftext: "Some body text here",
          permalink: "/r/BedStuy/comments/abc123/cool_post_about_brooklyn/",
          url: "https://www.reddit.com/r/BedStuy/comments/abc123/cool_post_about_brooklyn/",
          score: 42,
          author: "user1",
          created_utc: 1700000000,
          is_self: true,
        },
      },
      {
        data: {
          id: "def456",
          title: "Link post no body",
          selftext: "",
          permalink: "/r/BedStuy/comments/def456/link_post_no_body/",
          url: "https://example.com/article",
          score: 10,
          author: "user2",
          created_utc: 1700001000,
          is_self: false,
        },
      },
    ],
  },
};

describe("reddit canHandle", () => {
  it("returns true for reddit.com subreddit URLs", () => {
    expect(redditPlugin.canHandle("https://www.reddit.com/r/BedStuy/")).toBe(true);
    expect(redditPlugin.canHandle("https://www.reddit.com/r/nyc")).toBe(true);
    expect(redditPlugin.canHandle("https://reddit.com/r/interestingasfuck")).toBe(true);
  });

  it("returns false for non-Reddit URLs", () => {
    expect(redditPlugin.canHandle("https://www.youtube.com/watch")).toBe(false);
    expect(redditPlugin.canHandle("https://example.com/feed")).toBe(false);
  });
});

describe("reddit listItems", () => {
  it("fetches top posts and returns feed items with default options", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "application/json" },
      json: async () => SAMPLE_REDDIT_RESPONSE,
    } as unknown as Response);

    const items = await redditPlugin.listItems(
      "https://www.reddit.com/r/BedStuy/",
      fetchFn
    );

    // Should request top posts for the week (defaults)
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/r/BedStuy/top.json");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("t=week");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("limit=5");

    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.sourceName).toBe("r/BedStuy");
    expect(first.title).toBe("Cool post about Brooklyn");
    expect(first.description).toBe("Some body text here");
    expect(first.url).toBe("https://www.reddit.com/r/BedStuy/comments/abc123/cool_post_about_brooklyn/");
    expect(first.publishedAt).toEqual(new Date(1700000000 * 1000));
    expect(first.renderData).toMatchObject({
      richText: { text: "Some body text here" },
    });
  });

  it("uses richText title fallback when selftext is empty (link posts)", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "application/json" },
      json: async () => SAMPLE_REDDIT_RESPONSE,
    } as unknown as Response);

    const items = await redditPlugin.listItems(
      "https://www.reddit.com/r/BedStuy/",
      fetchFn
    );

    const linkPost = items[1]!;
    expect(linkPost.description).toBeUndefined();
    expect(linkPost.renderData).toMatchObject({
      richText: { text: "Link post no body" },
    });
  });

  it("respects sort/time/limit options", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "application/json" },
      json: async () => ({ data: { children: [] } }),
    } as unknown as Response);

    await redditPlugin.listItems(
      "https://www.reddit.com/r/nyc",
      fetchFn,
      { sort: "hot", time: "day", limit: 10 }
    );

    expect(fetchFn.mock.calls[0]?.[0]).toContain("/r/nyc/hot.json");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("t=day");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("limit=10");
  });

  it("throws a FeedError with url_not_supported for non-subreddit Reddit URLs", async () => {
    const fetchFn = vi.fn();

    const error = await redditPlugin.listItems("https://www.reddit.com/", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("url_not_supported");
    expect((error as FeedError).message).toContain("Only subreddit pages");
  });

  it("throws a FeedError with rate_limited when Reddit returns non-JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      headers: { get: () => "text/html" },
      status: 429,
    } as unknown as Response);

    const error = await redditPlugin.listItems("https://www.reddit.com/r/nyc", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });
});
