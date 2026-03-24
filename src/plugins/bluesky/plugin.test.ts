import { describe, it, expect, vi } from "vitest";
import blueskyPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_BSKY_RESPONSE = {
  feed: [
    {
      post: {
        uri: "at://did:plc:abc123/app.bsky.feed.post/rkey001",
        indexedAt: "2024-01-15T10:00:00.000Z",
        record: {
          text: "Hello from Bluesky!\nThis is a multiline post.",
        },
      },
    },
    {
      post: {
        uri: "at://did:plc:abc123/app.bsky.feed.post/rkey002",
        indexedAt: "2024-01-15T09:00:00.000Z",
        record: {
          text: "A very long first line that exceeds eighty characters and should be truncated to fit the title field nicely without including all the content",
        },
      },
    },
  ],
};

describe("bluesky canHandle", () => {
  it("returns true for bsky.app profile URLs", () => {
    expect(blueskyPlugin.canHandle("https://bsky.app/profile/foo.bsky.social")).toBe(true);
    expect(blueskyPlugin.canHandle("https://bsky.app/profile/user.bsky.social")).toBe(true);
  });

  it("returns false for non-Bluesky URLs", () => {
    expect(blueskyPlugin.canHandle("https://twitter.com")).toBe(false);
    expect(blueskyPlugin.canHandle("https://mastodon.social")).toBe(false);
  });
});

describe("bluesky listItems", () => {
  it("extracts handle and maps posts to feed items", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_BSKY_RESPONSE,
    } as unknown as Response);

    const items = await blueskyPlugin.listItems(
      "https://bsky.app/profile/foo.bsky.social",
      fetchFn
    );

    expect(fetchFn.mock.calls[0]?.[0]).toContain("actor=foo.bsky.social");

    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.sourceName).toBe("@foo.bsky.social");
    expect(first.title).toBe("Hello from Bluesky!");
    expect(first.url).toBe("https://bsky.app/profile/foo.bsky.social/post/rkey001");
    expect(first.publishedAt).toEqual(new Date("2024-01-15T10:00:00.000Z"));
    expect(first.renderData).toMatchObject({
      richText: { text: "Hello from Bluesky!\nThis is a multiline post." },
    });
  });

  it("truncates title to 80 chars for long first lines", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_BSKY_RESPONSE,
    } as unknown as Response);

    const items = await blueskyPlugin.listItems(
      "https://bsky.app/profile/foo.bsky.social",
      fetchFn
    );

    const second = items[1]!;
    expect(second.title.length).toBe(80);
  });

  it("uses limit option in API request", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feed: [] }),
    } as unknown as Response);

    await blueskyPlugin.listItems(
      "https://bsky.app/profile/foo.bsky.social",
      fetchFn,
      { limit: 20 }
    );

    expect(fetchFn.mock.calls[0]?.[0]).toContain("limit=20");
  });

  it("throws a FeedError with invalid_config when no handle can be extracted", async () => {
    const fetchFn = vi.fn();

    const error = await blueskyPlugin.listItems("https://bsky.app", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("invalid_config");
    expect((error as FeedError).message).toContain("Could not extract Bluesky handle");
  });

  it("throws a FeedError with rate_limited on 429 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as unknown as Response);

    const error = await blueskyPlugin.listItems("https://bsky.app/profile/foo.bsky.social", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });

  it("throws a FeedError with auth_error on 401 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);

    const error = await blueskyPlugin.listItems("https://bsky.app/profile/foo.bsky.social", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("auth_error");
  });

  it("throws a FeedError with source_not_found on 404 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    const error = await blueskyPlugin.listItems("https://bsky.app/profile/foo.bsky.social", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
  });
});
