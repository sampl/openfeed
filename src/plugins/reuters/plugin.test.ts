import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Reuters</title>
    <item>
      <title>World News Headline</title>
      <link>https://www.reuters.com/world/world-news-headline</link>
      <description>&lt;p&gt;Reuters news content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("reuters canHandle", () => {
  it("returns true for reuters.com URLs", () => {
    expect(plugin.canHandle("https://www.reuters.com")).toBe(true);
    expect(plugin.canHandle("https://www.reuters.com/world")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://apnews.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("reuters listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.reuters.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://feeds.reuters.com/reuters/topNews");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("World News Headline");
    expect(item.sourceName).toBe("Reuters");
    expect(item.url).toBe("https://www.reuters.com/world/world-news-headline");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Reuters news content</p>", text: "Reuters news content" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://feeds.reuters.com/reuters/businessNews";

    await plugin.listItems("https://www.reuters.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
