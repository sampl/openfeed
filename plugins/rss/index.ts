import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const genericRssPlugin: BackendFeedPlugin = {
  name: "rss",

  canHandle: (sourceUrl) => {
    try {
      const url = new URL(sourceUrl);
      const path = url.pathname.toLowerCase();
      const feedSuffixes = ["/feed", "/feed/", "/rss", "/atom", ".xml"];
      if (feedSuffixes.some((suffix) => path.endsWith(suffix))) return true;
      if (url.hostname.startsWith("feeds.") || url.hostname.startsWith("rss.")) return true;
    } catch {
      // Malformed URL — not handled
    }
    return false;
  },

  listItems: async (sourceUrl, fetchFn) => {
    return fetchAndParseRss(sourceUrl, sourceUrl, fetchFn);
  },
};

export default genericRssPlugin;
