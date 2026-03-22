import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Politico</title>
    <item>
      <title>Political News Story</title>
      <link>https://www.politico.com/news/2024/01/15/story</link>
      <description>&lt;p&gt;Political content here&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("politico canHandle", () => {
  it("returns true for politico.com URLs", () => {
    expect(plugin.canHandle("https://www.politico.com")).toBe(true);
    expect(plugin.canHandle("https://www.politico.com/news")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.thehill.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("politico listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.politico.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://www.politico.com/rss/politicopicks.xml");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Political News Story");
    expect(item.sourceName).toBe("Politico");
    expect(item.url).toBe("https://www.politico.com/news/2024/01/15/story");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Political content here</p>", text: "Political content here" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://www.politico.com/rss/congress.xml";

    await plugin.listItems("https://www.politico.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
