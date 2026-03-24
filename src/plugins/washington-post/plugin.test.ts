import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>The Washington Post</title>
    <item>
      <title>National News Story</title>
      <link>https://www.washingtonpost.com/national/story</link>
      <description>&lt;p&gt;Article content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("washington-post canHandle", () => {
  it("returns true for washingtonpost.com URLs", () => {
    expect(plugin.canHandle("https://www.washingtonpost.com")).toBe(true);
    expect(plugin.canHandle("https://www.washingtonpost.com/national")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.nytimes.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("washington-post listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.washingtonpost.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://feeds.washingtonpost.com/rss/national");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("National News Story");
    expect(item.sourceName).toBe("The Washington Post");
    expect(item.url).toBe("https://www.washingtonpost.com/national/story");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Article content</p>", text: "Article content" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://feeds.washingtonpost.com/rss/world";

    await plugin.listItems("https://www.washingtonpost.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
