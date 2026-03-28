import { describe, it, expect, vi } from "vitest";
import genericRssPlugin from "./index.ts";
import { FeedError } from "../types.js";
import { makeErrorResponse } from "../__fixtures__/index.ts";

const SAMPLE_RSS2_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example Blog</title>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article</link>
      <description>&lt;p&gt;Test content&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom-article"/>
    <summary>Atom content here</summary>
    <published>2024-01-15T10:00:00+00:00</published>
  </entry>
</feed>`;

const makeFetch = (xml: string) =>
  vi.fn().mockResolvedValue({ ok: true, text: async () => xml } as unknown as Response);

describe("rss canHandle", () => {
  it("returns true for URLs ending with recognised feed suffixes", () => {
    expect(genericRssPlugin.canHandle("https://example.com/feed")).toBe(true);
    expect(genericRssPlugin.canHandle("https://example.com/rss")).toBe(true);
    expect(genericRssPlugin.canHandle("https://example.com/atom")).toBe(true);
    expect(genericRssPlugin.canHandle("https://example.com/feed.xml")).toBe(true);
    expect(genericRssPlugin.canHandle("https://example.com/feed/")).toBe(true);
  });

  it("returns true for feeds. and rss. subdomains", () => {
    expect(genericRssPlugin.canHandle("https://feeds.example.com/channel")).toBe(true);
    expect(genericRssPlugin.canHandle("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")).toBe(true);
  });

  it("returns false for plain domain or unrecognised URL shapes", () => {
    expect(genericRssPlugin.canHandle("https://example.com")).toBe(false);
    expect(genericRssPlugin.canHandle("https://example.com/about")).toBe(false);
  });
});

describe("rss listItems — RSS 2.0", () => {
  it("parses RSS 2.0 and returns NewFeedItem array", async () => {
    const fetchFn = makeFetch(SAMPLE_RSS2_XML);

    const items = await genericRssPlugin.listItems("https://example.com/feed", fetchFn);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Test Article");
    expect(item.sourceName).toBe("Example Blog");
    expect(item.url).toBe("https://example.com/article");
    expect(item.publishedAt).toEqual(new Date("Mon, 15 Jan 2024 10:00:00 +0000"));
    expect(item.renderData).toMatchObject({
      richText: { html: "<p>Test content</p>", text: "Test content" },
    });
  });
});

describe("rss listItems — Atom", () => {
  it("parses Atom feeds and returns NewFeedItem array", async () => {
    const fetchFn = makeFetch(SAMPLE_ATOM_XML);

    const items = await genericRssPlugin.listItems("https://example.com/atom", fetchFn);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.title).toBe("Atom Article");
    expect(item.sourceName).toBe("Atom Blog");
    expect(item.url).toBe("https://example.com/atom-article");
    expect(item.publishedAt).toEqual(new Date("2024-01-15T10:00:00+00:00"));
    expect(item.renderData).toMatchObject({
      richText: { text: "Atom content here" },
    });
  });
});

describe("rss listItems — error cases", () => {
  it("throws when the XML does not match RSS or Atom format", async () => {
    const fetchFn = makeFetch("<root><data>not a feed</data></root>");

    await expect(
      genericRssPlugin.listItems("https://example.com/feed", fetchFn)
    ).rejects.toThrow("unrecognised XML format");
  });

  it("throws source_not_found on 404", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(404));
    const err = await genericRssPlugin.listItems("https://example.com/feed", fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("source_not_found");
  });

  it("throws auth_error on 401", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(401));
    const err = await genericRssPlugin.listItems("https://example.com/feed", fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("auth_error");
  });

  it("throws auth_error on 403", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(403));
    const err = await genericRssPlugin.listItems("https://example.com/feed", fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("auth_error");
  });

  it("throws rate_limited on 429", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(429));
    const err = await genericRssPlugin.listItems("https://example.com/feed", fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("rate_limited");
  });

  it("throws network_error on 500", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(500));
    const err = await genericRssPlugin.listItems("https://example.com/feed", fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("network_error");
  });
});
