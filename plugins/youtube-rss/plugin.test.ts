import { describe, it, expect, vi } from "vitest";
import youtubeRssPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <title>Test Video Title</title>
    <published>2024-01-15T10:00:00+00:00</published>
    <summary>Test video description</summary>
    <link rel="alternate" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
  </entry>
</feed>`;

// HTML fragment that would appear on a YouTube channel page (ytInitialData style)
const SAMPLE_CHANNEL_PAGE_HTML = `<html><head><script>"channelId":"UC_x5XG1OV2P6uZZ5FSM9Ttw"</script></head></html>`;

// HTML using only the canonical link tag — matches modern YouTube pages that omit the channelId JSON field
const SAMPLE_CHANNEL_PAGE_CANONICAL_HTML = `<html><head>
  <link rel="canonical" href="https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw">
</head><body></body></html>`;

describe("youtube-rss canHandle", () => {
  it("returns true for youtube.com URLs", () => {
    expect(youtubeRssPlugin.canHandle("https://www.youtube.com/@SomeChannel")).toBe(true);
    expect(youtubeRssPlugin.canHandle("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw")).toBe(true);
  });

  it("returns true for mobile youtube.com URLs", () => {
    expect(youtubeRssPlugin.canHandle("https://m.youtube.com/@mattpocockuk")).toBe(true);
    expect(youtubeRssPlugin.canHandle("https://m.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw")).toBe(true);
  });

  it("returns false for non-YouTube URLs", () => {
    expect(youtubeRssPlugin.canHandle("https://vimeo.com/user123")).toBe(false);
    expect(youtubeRssPlugin.canHandle("https://example.com/feed")).toBe(false);
  });
});

describe("youtube-rss listItems", () => {
  it("resolves a channel ID from an @handle URL and returns feed items", async () => {
    const fetchFn = vi.fn()
      // First call: fetch the channel page HTML to resolve the channel ID
      .mockResolvedValueOnce({ text: async () => SAMPLE_CHANNEL_PAGE_HTML } as unknown as Response)
      // Second call: fetch the RSS feed XML
      .mockResolvedValueOnce({ text: async () => SAMPLE_FEED_XML } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://www.youtube.com/@SomeChannel",
      fetchFn
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
    // Second fetch should request the feed using the resolved channel ID
    expect(fetchFn.mock.calls[1]?.[0]).toContain("UC_x5XG1OV2P6uZZ5FSM9Ttw");

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Test Video Title");
    expect(item.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(item.publishedAt).toEqual(new Date("2024-01-15T10:00:00+00:00"));
    expect(item.renderData).toMatchObject({
      video: { videoId: "dQw4w9WgXcQ" },
      richText: { text: "Test video description" },
    });
  });

  it("uses the channel ID directly from a /channel/ URL (no page scrape)", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      text: async () => SAMPLE_FEED_XML,
    } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
      fetchFn
    );

    // Only one fetch — no page scrape needed
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("UC_x5XG1OV2P6uZZ5FSM9Ttw");
    expect(items).toHaveLength(1);
  });

  it("throws a FeedError with source_not_found when channel ID cannot be resolved", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      text: async () => "<html>no channel id here</html>",
    } as unknown as Response);

    const error = await youtubeRssPlugin.listItems("https://www.youtube.com/@BadHandle", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
    expect((error as FeedError).message).toContain("Could not resolve YouTube channel ID");
  });

  it("normalizes mobile URL to desktop when scraping @handle", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ text: async () => SAMPLE_CHANNEL_PAGE_HTML } as unknown as Response)
      .mockResolvedValueOnce({ text: async () => SAMPLE_FEED_XML } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://m.youtube.com/@SomeChannel",
      fetchFn
    );

    // First fetch should use desktop URL, not mobile
    expect(fetchFn.mock.calls[0]?.[0]).toContain("www.youtube.com");
    expect(fetchFn.mock.calls[0]?.[0]).not.toContain("m.youtube.com");
    expect(items).toHaveLength(1);
  });

  it("resolves channel ID from canonical link tag when channelId JSON is absent", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ text: async () => SAMPLE_CHANNEL_PAGE_CANONICAL_HTML } as unknown as Response)
      .mockResolvedValueOnce({ text: async () => SAMPLE_FEED_XML } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://www.youtube.com/@SomeChannel",
      fetchFn
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]?.[0]).toContain("UC_x5XG1OV2P6uZZ5FSM9Ttw");
    expect(items).toHaveLength(1);
  });

  it("resolves channel ID from mobile URL via canonical link tag", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ text: async () => SAMPLE_CHANNEL_PAGE_CANONICAL_HTML } as unknown as Response)
      .mockResolvedValueOnce({ text: async () => SAMPLE_FEED_XML } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://m.youtube.com/@mattpocockuk",
      fetchFn
    );

    // Page fetch should use desktop URL
    expect(fetchFn.mock.calls[0]?.[0]).toContain("www.youtube.com");
    expect(fetchFn.mock.calls[0]?.[0]).not.toContain("m.youtube.com");
    expect(fetchFn.mock.calls[1]?.[0]).toContain("UC_x5XG1OV2P6uZZ5FSM9Ttw");
    expect(items).toHaveLength(1);
  });

  it("extracts channel ID directly from mobile /channel/ URL without scraping", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      text: async () => SAMPLE_FEED_XML,
    } as unknown as Response);

    const items = await youtubeRssPlugin.listItems(
      "https://m.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
      fetchFn
    );

    // Only one fetch — no page scrape needed for /channel/ URLs
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("UC_x5XG1OV2P6uZZ5FSM9Ttw");
    expect(items).toHaveLength(1);
  });
});
