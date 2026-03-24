import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Al Jazeera</title>
    <item>
      <title>Global News Story</title>
      <link>https://www.aljazeera.com/news/2024/1/15/global-news-story</link>
      <description>&lt;p&gt;Al Jazeera news content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("al-jazeera canHandle", () => {
  it("returns true for aljazeera.com URLs", () => {
    expect(plugin.canHandle("https://www.aljazeera.com")).toBe(true);
    expect(plugin.canHandle("https://www.aljazeera.com/news")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.bbc.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("al-jazeera listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.aljazeera.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://www.aljazeera.com/xml/rss/all.xml");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Global News Story");
    expect(item.sourceName).toBe("Al Jazeera");
    expect(item.url).toBe("https://www.aljazeera.com/news/2024/1/15/global-news-story");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Al Jazeera news content</p>", text: "Al Jazeera news content" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://www.aljazeera.com/xml/rss/opinion.xml";

    await plugin.listItems("https://www.aljazeera.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
