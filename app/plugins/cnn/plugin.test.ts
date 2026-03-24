import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>CNN</title>
    <item>
      <title>Breaking News Story</title>
      <link>https://www.cnn.com/2024/01/15/politics/story/index.html</link>
      <description>&lt;p&gt;News content here&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("cnn canHandle", () => {
  it("returns true for cnn.com URLs", () => {
    expect(plugin.canHandle("https://www.cnn.com")).toBe(true);
    expect(plugin.canHandle("https://www.cnn.com/politics")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.bbc.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("cnn listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.cnn.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://rss.cnn.com/rss/edition.rss");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Breaking News Story");
    expect(item.sourceName).toBe("CNN");
    expect(item.url).toBe("https://www.cnn.com/2024/01/15/politics/story/index.html");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>News content here</p>", text: "News content here" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://rss.cnn.com/rss/cnn_topstories.rss";

    await plugin.listItems("https://www.cnn.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
