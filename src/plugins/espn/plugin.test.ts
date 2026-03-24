import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>ESPN</title>
    <item>
      <title>Sports Headline</title>
      <link>https://www.espn.com/nfl/story/_/id/12345/sports-headline</link>
      <description>&lt;p&gt;ESPN sports content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("espn canHandle", () => {
  it("returns true for espn.com URLs", () => {
    expect(plugin.canHandle("https://www.espn.com")).toBe(true);
    expect(plugin.canHandle("https://www.espn.com/nfl")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.nfl.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("espn listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.espn.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://www.espn.com/espn/rss/news");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Sports Headline");
    expect(item.sourceName).toBe("ESPN");
    expect(item.url).toBe("https://www.espn.com/nfl/story/_/id/12345/sports-headline");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>ESPN sports content</p>", text: "ESPN sports content" },
    });
  });

  it("uses options.feed when provided for sport-specific feeds", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const nflFeed = "https://www.espn.com/espn/rss/nfl/news";

    await plugin.listItems("https://www.espn.com/nfl", fetchFn, { feed: nflFeed });

    expect(fetchFn).toHaveBeenCalledWith(nflFeed);
  });
});
