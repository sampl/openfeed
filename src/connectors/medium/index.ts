import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

// Extract @username from paths like /@username or /@username/some-article
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
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    if (typeof options.feed === "string") {
      return fetchAndParseRss(options.feed, sourceUrl, fetchFn, "Medium");
    }

    const username = extractUsername(sourceUrl);
    const feedUrl = username
      ? `https://medium.com/feed/@${username}`
      : "https://medium.com/feed";
    const sourceName = username ? `Medium - @${username}` : "Medium";

    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, sourceName);
  },
};

export default plugin;
