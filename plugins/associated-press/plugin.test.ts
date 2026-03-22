import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Associated Press</title>
    <item>
      <title>Top News Story</title>
      <link>https://apnews.com/article/top-news-story</link>
      <description>&lt;p&gt;AP news content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("associated-press canHandle", () => {
  it("returns true for apnews.com URLs", () => {
    expect(plugin.canHandle("https://apnews.com")).toBe(true);
    expect(plugin.canHandle("https://apnews.com/hub/us-news")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.reuters.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("associated-press listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://apnews.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://feeds.apnews.com/apnews/topnews");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Top News Story");
    expect(item.sourceName).toBe("Associated Press");
    expect(item.url).toBe("https://apnews.com/article/top-news-story");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>AP news content</p>", text: "AP news content" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://feeds.apnews.com/apnews/science";

    await plugin.listItems("https://apnews.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
