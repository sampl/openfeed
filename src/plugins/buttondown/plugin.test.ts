import { describe, it, expect, vi } from "vitest";
import buttondownPlugin from "./index.ts";

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Hacker Newsletter</title>
    <item>
      <title>Issue #123: Top links from Hacker News</title>
      <link>https://buttondown.com/hacker-newsletter/archive/issue-123</link>
      <description>&lt;p&gt;This week in HN: AI, open source tools, and more.&lt;/p&gt;</description>
      <pubDate>Fri, 15 Mar 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("buttondown canHandle", () => {
  it("returns true for a buttondown.com archive URL", () => {
    expect(buttondownPlugin.canHandle("https://buttondown.com/hacker-newsletter/archive")).toBe(true);
  });

  it("returns true for archive URL with trailing slash", () => {
    expect(buttondownPlugin.canHandle("https://buttondown.com/hacker-newsletter/archive/")).toBe(true);
  });

  it("returns false for a non-archive buttondown URL", () => {
    expect(buttondownPlugin.canHandle("https://buttondown.com/hacker-newsletter")).toBe(false);
    expect(buttondownPlugin.canHandle("https://buttondown.com/hacker-newsletter/rss")).toBe(false);
  });

  it("returns false for non-buttondown URLs", () => {
    expect(buttondownPlugin.canHandle("https://substack.com/newsletter/archive")).toBe(false);
    expect(buttondownPlugin.canHandle("https://example.com/archive")).toBe(false);
  });
});

describe("buttondown listItems", () => {
  it("fetches the RSS URL derived from the archive URL", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    await buttondownPlugin.listItems("https://buttondown.com/hacker-newsletter/archive", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://buttondown.com/hacker-newsletter/rss");
  });

  it("parses feed items and returns NewFeedItem array", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS_XML);

    const items = await buttondownPlugin.listItems(
      "https://buttondown.com/hacker-newsletter/archive",
      fetchFn
    );

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Issue #123: Top links from Hacker News");
    expect(item.sourceName).toBe("Hacker Newsletter");
    expect(item.sourceUrl).toBe("https://buttondown.com/hacker-newsletter/archive");
    expect(item.url).toBe("https://buttondown.com/hacker-newsletter/archive/issue-123");
    expect(item.publishedAt).toEqual(new Date("Fri, 15 Mar 2024 10:00:00 +0000"));
    expect(item.renderData).toMatchObject({
      richText: {
        html: "<p>This week in HN: AI, open source tools, and more.</p>",
        text: "This week in HN: AI, open source tools, and more.",
      },
    });
  });
});
