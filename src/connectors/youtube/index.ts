import { XMLParser } from "fast-xml-parser";
import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
import { FeedError } from "../types.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const toDesktopUrl = (url: string): string =>
  url.replace("://m.youtube.com", "://www.youtube.com");

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

const isChannelIdUrl = (url: URL): boolean => url.pathname.startsWith("/channel/");
const isHandleUrl = (url: URL): boolean => url.pathname.startsWith("/@");

const getChannelId = async (sourceUrl: string, fetchFn: typeof fetch): Promise<string> => {
  const url = new URL(sourceUrl);
  if (isChannelIdUrl(url)) {
    return url.pathname.split("/").filter(Boolean)[1] ?? (() => { throw new FeedError("Missing channel ID in URL", "invalid_config"); })();
  }
  if (!isHandleUrl(url)) {
    throw new FeedError(
      `YouTube URL type not supported: ${sourceUrl}. Only channel pages (/@handle or /channel/ID) are supported.`,
      "url_not_supported"
    );
  }
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

const youtubePlugin: BackendFeedPlugin = {
  name: "youtube",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" rx="4" fill="#FF0000"/><polygon points="8,5 8,15 16,10" fill="white"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("youtube.com"),

  listItems: async (sourceUrl, fetchFn): Promise<readonly PluginAS2Object[]> => {
    const channelId = await getChannelId(sourceUrl, fetchFn);
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetchFn(feedUrl);
    const xml = await response.text();
    const parsed = parser.parse(xml) as YoutubeAtomFeed;

    const rawEntries = parsed.feed?.entry ?? [];
    const entries: YoutubeAtomEntry[] = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

    return entries.map((entry): PluginAS2Object => {
      const videoId = entry["yt:videoId"] ?? "";
      const name = entry.title ?? "";
      const description =
        entry["media:group"]?.["media:description"] ?? entry.summary ?? "";
      const publishedRaw = entry.published ?? new Date().toISOString();

      return {
        type: "Video",
        name,
        summary: description || undefined,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        published: new Date(publishedRaw),
        attachment: [{
          type: "Link",
          href: `https://www.youtube.com/embed/${videoId}`,
          mediaType: "text/html",
          rel: "video",
          name,
        }],
      };
    });
  },
};

export default youtubePlugin;
