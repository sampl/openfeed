import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const extractUsername = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\/@([^/?#]+)/);
    return match ? match[1]! : null;
  } catch {
    return null;
  }
};

const plugin: BackendFeedPlugin = {
  name: "medium",
  canHandle: (url) => url.includes("medium.com"),
  listItems: async (sourceUrl, fetchFn, _context, options = {}) => {
    if (typeof options.feed === "string") {
      return fetchAndParseRss(options.feed, sourceUrl, fetchFn);
    }

    const username = extractUsername(sourceUrl);
    const feedUrl = username
      ? `https://medium.com/feed/@${username}`
      : "https://medium.com/feed";

    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn);
  },
};

export default plugin;
