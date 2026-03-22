import { XMLParser } from "fast-xml-parser";
import type { BackendFeedPlugin, NewFeedItem } from "../types.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Strip HTML tags to produce a plain-text fallback
const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

// Resolve the feed URL: append /feed if the URL has no feed-like suffix
const resolveFeedUrl = (sourceUrl: string): string => {
  const lower = sourceUrl.toLowerCase();
  if (
    lower.endsWith("/feed") ||
    lower.endsWith("/rss") ||
    lower.endsWith("/atom") ||
    lower.endsWith(".xml")
  ) {
    return sourceUrl;
  }
  const withoutTrailingSlash = sourceUrl.replace(/\/$/, "");
  return `${withoutTrailingSlash}/feed`;
};

interface RssItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

interface RssFeed {
  rss?: { channel?: { item?: RssItem | RssItem[]; title?: string } };
}

const substackRssPlugin: BackendFeedPlugin = {
  name: "substack-rss",

  // Handle both native substack.com domains. Custom Substack domains that expose
  // a /feed endpoint are caught by canHandle checking for a bare domain (no path).
  canHandle: (sourceUrl) => {
    if (sourceUrl.includes("substack.com")) return true;
    // Treat bare domain URLs (no meaningful path) as potential Substack blogs
    try {
      const url = new URL(sourceUrl);
      const hasNoPath = url.pathname === "/" || url.pathname === "";
      return hasNoPath;
    } catch {
      return false;
    }
  },

  listItems: async (sourceUrl, fetchFn): Promise<readonly NewFeedItem[]> => {
    const feedUrl = resolveFeedUrl(sourceUrl);
    const response = await fetchFn(feedUrl);
    const xml = await response.text();
    const parsed = parser.parse(xml) as RssFeed;

    const channel = parsed.rss?.channel;
    const sourceName = channel?.title ?? new URL(sourceUrl).hostname;
    const rawItems = channel?.item ?? [];
    // fast-xml-parser returns a single object when there is only one item
    const items: RssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items.map((item): NewFeedItem => {
      const title = item.title ?? "";
      const rawHtml = item.description ?? "";
      const plainText = stripHtml(rawHtml);
      const url = item.link ?? sourceUrl;
      const publishedRaw = item.pubDate ?? new Date().toISOString();

      return {
        sourceName,
        sourceUrl,
        title,
        description: plainText.slice(0, 300),
        url,
        publishedAt: new Date(publishedRaw),
        renderData: {
          richText: { html: rawHtml, text: plainText },
        },
      };
    });
  },
};

export default substackRssPlugin;
