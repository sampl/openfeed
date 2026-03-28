import { describe, it, expect, vi } from "vitest";
import buttondownPlugin from "./index.ts";
import { FeedError } from "../types.js";
import { makeErrorResponse, MALFORMED_XML } from "../__fixtures__/index.ts";

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

  it("parses feed items and returns PluginFeedItem array", async () => {
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

describe("buttondown listItems — HTTP errors", () => {
  const SOURCE_URL = "https://buttondown.com/hacker-newsletter/archive";

  it("throws source_not_found on 404", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(404));
    const err = await buttondownPlugin.listItems(SOURCE_URL, fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("source_not_found");
  });

  it("throws auth_error on 401", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(401));
    const err = await buttondownPlugin.listItems(SOURCE_URL, fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("auth_error");
  });

  it("throws rate_limited on 429", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(429));
    const err = await buttondownPlugin.listItems(SOURCE_URL, fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("rate_limited");
  });

  it("throws network_error on 500", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(500));
    const err = await buttondownPlugin.listItems(SOURCE_URL, fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("network_error");
  });

  it("throws parse_error on malformed XML response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: true, text: async () => MALFORMED_XML } as unknown as Response);
    const err = await buttondownPlugin.listItems(SOURCE_URL, fetchFn).catch((e) => e);
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe("parse_error");
  });
});
