import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

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

const substackRssPlugin: BackendFeedPlugin = {
  name: "substack",

  canHandle: (sourceUrl) => {
    if (sourceUrl.includes("substack.com")) return true;
    try {
      const url = new URL(sourceUrl);
      const hasNoPath = url.pathname === "/" || url.pathname === "";
      return hasNoPath;
    } catch {
      return false;
    }
  },

  listItems: async (sourceUrl, fetchFn) => {
    const feedUrl = resolveFeedUrl(sourceUrl);
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn);
  },
};

export default substackRssPlugin;
