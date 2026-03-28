import { describe, it, expect, vi } from "vitest";
import substackRssPlugin from "./index.ts";
import { SAMPLE_RSS2_XML } from "../__fixtures__/index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>My Substack</title>
    <item>
      <title>Hello World</title>
      <link>https://mysubstack.substack.com/p/hello-world</link>
      <description>&lt;p&gt;First post content.&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ text: async () => xml } as unknown as Response);

describe("substack canHandle", () => {
  it("returns true for substack.com URLs", () => {
    expect(substackRssPlugin.canHandle("https://someblog.substack.com")).toBe(true);
    expect(substackRssPlugin.canHandle("https://someblog.substack.com/feed")).toBe(true);
  });

  it("returns true for bare domain URLs (potential custom Substack domains)", () => {
    expect(substackRssPlugin.canHandle("https://wheresyoured.at")).toBe(true);
    expect(substackRssPlugin.canHandle("https://www.wheresyoured.at/")).toBe(true);
  });

  it("returns false for URLs with a non-root path", () => {
    expect(substackRssPlugin.canHandle("https://example.com/feed")).toBe(false);
    expect(substackRssPlugin.canHandle("https://example.com/rss.xml")).toBe(false);
  });
});

describe("substack listItems", () => {
  it("appends /feed to bare domain URLs before fetching", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    await substackRssPlugin.listItems("https://someblog.substack.com", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://someblog.substack.com/feed");
  });

  it("does not double-append /feed when URL already ends with /feed", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    await substackRssPlugin.listItems("https://someblog.substack.com/feed", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://someblog.substack.com/feed");
  });

  it("parses RSS items and returns PluginFeedItem array", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await substackRssPlugin.listItems(
      "https://someblog.substack.com",
      fetchFn
    );

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Hello World");
    expect(item.sourceName).toBe("My Substack");
    expect(item.url).toBe("https://mysubstack.substack.com/p/hello-world");
    expect(item.publishedAt).toEqual(new Date("Mon, 15 Jan 2024 10:00:00 +0000"));
    expect(item.renderData).toMatchObject({
      richText: { text: "First post content." },
    });
  });

  it("strips HTML tags from description to produce plain text", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const items = await substackRssPlugin.listItems("https://someblog.substack.com", fetchFn);

    expect(items[0]?.renderData).toMatchObject({
      richText: { html: "<p>First post content.</p>", text: "First post content." },
    });
  });
});

describe("substack listItems — edge cases", () => {
  it("returns empty array when feed has no items", async () => {
    const emptyFeed = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Empty Feed</title></channel></rss>`;
    const fetchFn = vi.fn().mockResolvedValueOnce({ text: async () => emptyFeed } as unknown as Response);
    const items = await substackRssPlugin.listItems("https://someblog.substack.com", fetchFn);
    expect(items).toHaveLength(0);
  });

  it("uses shared RSS 2.0 fixture and parses correctly", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ text: async () => SAMPLE_RSS2_XML } as unknown as Response);
    const items = await substackRssPlugin.listItems("https://someblog.substack.com", fetchFn);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Test Article");
    expect(items[0]!.sourceName).toBe("Test Feed");
  });

  it("falls back to hostname as sourceName when channel title is missing", async () => {
    const feedNoTitle = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>Post</title><link>https://someblog.substack.com/p/post</link></item>
</channel></rss>`;
    const fetchFn = vi.fn().mockResolvedValueOnce({ text: async () => feedNoTitle } as unknown as Response);
    const items = await substackRssPlugin.listItems("https://someblog.substack.com", fetchFn);
    expect(items[0]!.sourceName).toBe("someblog.substack.com");
  });
});
