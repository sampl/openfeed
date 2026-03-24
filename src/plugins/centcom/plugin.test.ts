import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>CENTCOM</title>
    <item>
      <title>CENTCOM News Release</title>
      <link>https://www.centcom.mil/MEDIA/NEWS-ARTICLES/News-Article-View/Article/12345/centcom-news-release/</link>
      <description>&lt;p&gt;CENTCOM press release content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("centcom canHandle", () => {
  it("returns true for centcom.mil URLs", () => {
    expect(plugin.canHandle("https://www.centcom.mil")).toBe(true);
    expect(plugin.canHandle("https://www.centcom.mil/MEDIA/NEWS-ARTICLES/")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://www.defense.gov")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("centcom listItems", () => {
  it("fetches the default RSS feed and returns items", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://www.centcom.mil", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "https://www.centcom.mil/DesktopModules/ArticleCS/Feed.aspx?ContentType=1&Site=575&isdashboardselected=0&max=12"
    );
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("CENTCOM News Release");
    expect(item.sourceName).toBe("CENTCOM");
    expect(item.url).toBe(
      "https://www.centcom.mil/MEDIA/NEWS-ARTICLES/News-Article-View/Article/12345/centcom-news-release/"
    );
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>CENTCOM press release content</p>", text: "CENTCOM press release content" },
    });
  });

  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://www.centcom.mil/DesktopModules/ArticleCS/Feed.aspx?ContentType=1&Site=575&max=25";

    await plugin.listItems("https://www.centcom.mil", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
