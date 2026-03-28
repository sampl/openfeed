import { XMLParser } from "fast-xml-parser";
import type { BackendFeedPlugin, PluginFeedItem } from "../types.js";
import { FeedError } from "../types.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Normalize mobile YouTube URL to desktop so page scraping works
// (mobile pages don't embed channelId in HTML)
const toDesktopUrl = (url: string): string =>
  url.replace("://m.youtube.com", "://www.youtube.com");

// Extract channel ID from a YouTube page using two strategies:
// 1. channelId JSON field in ytInitialData (may be removed in future YouTube updates)
// 2. Canonical link tag in the page head (more stable, always present)
const resolveChannelId = async (handleUrl: string, fetchFn: typeof fetch): Promise<string> => {
  const response = await fetchFn(toDesktopUrl(handleUrl));
  const html = await response.text();

  const jsonMatch = html.match(/"channelId":"([^"]+)"/);
  if (jsonMatch?.[1]) return jsonMatch[1];

  const canonicalMatch = html.match(
    /rel="canonical"\s+href="https?:\/\/(?:www\.)?youtube\.com\/channel\/([A-Za-z0-9_-]+)"/
  );
  if (canonicalMatch?.[1]) return canonicalMatch[1];

  throw new FeedError(
    `Could not resolve YouTube channel ID from ${handleUrl}. ` +
      "Make sure the URL is a valid YouTube channel page.",
    "source_not_found"
  );
};

// Determine whether the URL already contains a bare channel ID path segment
const isChannelIdUrl = (url: URL): boolean => url.pathname.startsWith("/channel/");

const getChannelId = async (sourceUrl: string, fetchFn: typeof fetch): Promise<string> => {
  const url = new URL(sourceUrl);
  if (isChannelIdUrl(url)) {
    // /channel/CHANNEL_ID — extract directly
    return url.pathname.split("/").filter(Boolean)[1] ?? (() => { throw new FeedError("Missing channel ID in URL", "invalid_config"); })();
  }
  // @handle URL — must scrape the page to find the channel ID
  return resolveChannelId(sourceUrl, fetchFn);
};

interface YoutubeAtomEntry {
  "yt:videoId"?: string;
  title?: string;
  published?: string;
  summary?: string;
  link?: { "@_href"?: string };
  "media:group"?: { "media:description"?: string };
}

interface YoutubeAtomFeed {
  feed?: { entry?: YoutubeAtomEntry | YoutubeAtomEntry[] };
}

const youtubRssPlugin: BackendFeedPlugin = {
  name: "youtube",
  // Red rounded rectangle with white play triangle — YouTube brand colours
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" rx="4" fill="#FF0000"/><polygon points="8,5 8,15 16,10" fill="white"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("youtube.com"),

  listItems: async (sourceUrl, fetchFn): Promise<readonly PluginFeedItem[]> => {
    const channelId = await getChannelId(sourceUrl, fetchFn);
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetchFn(feedUrl);
    const xml = await response.text();
    const parsed = parser.parse(xml) as YoutubeAtomFeed;

    const rawEntries = parsed.feed?.entry ?? [];
    // fast-xml-parser returns a single object instead of an array when there is only one entry
    const entries: YoutubeAtomEntry[] = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

    return entries.map((entry): PluginFeedItem => {
      const videoId = entry["yt:videoId"] ?? "";
      const title = entry.title ?? "";
      const description =
        entry["media:group"]?.["media:description"] ?? entry.summary ?? "";
      const publishedRaw = entry.published ?? new Date().toISOString();

      return {
        sourceName: "YouTube",
        sourceUrl,
        title,
        description,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: new Date(publishedRaw),
        renderData: {
          video: { videoId },
          richText: { text: description || title },
        },
      };
    });
  },
};

export default youtubRssPlugin;
