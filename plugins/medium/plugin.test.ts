import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Medium</title>
    <item>
      <title>An Interesting Article</title>
      <link>https://medium.com/@johndoe/an-interesting-article</link>
      <description>&lt;p&gt;Medium article content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("medium canHandle", () => {
  it("returns true for medium.com URLs", () => {
    expect(plugin.canHandle("https://medium.com")).toBe(true);
    expect(plugin.canHandle("https://medium.com/@johndoe")).toBe(true);
  });

  it("returns false for unrelated URLs", () => {
    expect(plugin.canHandle("https://substack.com")).toBe(false);
    expect(plugin.canHandle("https://example.com")).toBe(false);
  });
});

describe("medium listItems — with username", () => {
  it("extracts username and fetches user-specific feed", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://medium.com/@johndoe", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://medium.com/feed/@johndoe");
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("An Interesting Article");
    expect(item.sourceName).toBe("Medium - @johndoe");
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Medium article content</p>", text: "Medium article content" },
    });
  });
});

describe("medium listItems — without username", () => {
  it("fetches the generic medium feed when no username is present", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await plugin.listItems("https://medium.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://medium.com/feed");
    expect(items).toHaveLength(1);
    expect(items[0]!.sourceName).toBe("Medium");
  });
});

describe("medium listItems — options.feed override", () => {
  it("uses options.feed when provided", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);
    const customFeed = "https://medium.com/feed/tag/typescript";

    await plugin.listItems("https://medium.com", fetchFn, { feed: customFeed });

    expect(fetchFn).toHaveBeenCalledWith(customFeed);
  });
});
