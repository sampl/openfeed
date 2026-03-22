import { describe, it, expect, vi } from "vitest";
import podcastsPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_RSS_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Podcast</title>
    <item>
      <title>Episode 1</title>
      <link>https://example.com/ep1</link>
      <description>First episode</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const APPLE_PODCASTS_URL =
  "https://podcasts.apple.com/us/podcast/my-show/id123456";
const SPOTIFY_URL = "https://open.spotify.com/show/abc";

describe("podcasts canHandle", () => {
  it("returns true for Apple Podcasts URLs", () => {
    expect(podcastsPlugin.canHandle(APPLE_PODCASTS_URL)).toBe(true);
  });

  it("returns true for Spotify show URLs", () => {
    expect(podcastsPlugin.canHandle(SPOTIFY_URL)).toBe(true);
  });

  it("returns false for other URLs", () => {
    expect(podcastsPlugin.canHandle("https://soundcloud.com")).toBe(false);
  });
});

describe("podcasts listItems", () => {
  it("throws a FeedError with invalid_config for Spotify URLs", async () => {
    const fetchFn = vi.fn();

    const error = await podcastsPlugin.listItems(SPOTIFY_URL, fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("invalid_config");
    expect((error as FeedError).message).toContain("Spotify");
  });

  it("throws a FeedError with invalid_config when podcast ID cannot be extracted", async () => {
    const fetchFn = vi.fn();
    const error = await podcastsPlugin.listItems(
      "https://podcasts.apple.com/us/podcast/my-show",
      fetchFn
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("invalid_config");
  });

  it("throws a FeedError with source_not_found when iTunes lookup returns 404", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response);
    const error = await podcastsPlugin.listItems(APPLE_PODCASTS_URL, fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
  });

  it("throws a FeedError with item_not_found when iTunes lookup returns no feedUrl", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{}] }),
    } as unknown as Response);
    const error = await podcastsPlugin.listItems(APPLE_PODCASTS_URL, fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("item_not_found");
  });

  it("fetches iTunes lookup then RSS feed for Apple Podcasts URLs", async () => {
    const fetchFn = vi
      .fn()
      // First call: iTunes lookup
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ feedUrl: "https://feeds.example.com/my-show.rss" }],
        }),
      } as unknown as Response)
      // Second call: RSS feed
      .mockResolvedValueOnce({
        ok: true,
        text: async () => SAMPLE_RSS_FEED,
      } as unknown as Response);

    const items = await podcastsPlugin.listItems(APPLE_PODCASTS_URL, fetchFn);

    // iTunes lookup should be called with the podcast ID extracted from the URL
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      "https://itunes.apple.com/lookup?id=123456&entity=podcast"
    );
    // RSS feed should be fetched with the feedUrl from the lookup
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "https://feeds.example.com/my-show.rss"
    );

    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Episode 1");
    expect(items[0]!.url).toBe("https://example.com/ep1");
  });
});
