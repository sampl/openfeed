import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

// Derive the RSS feed URL from a Buttondown archive URL.
// https://buttondown.com/{newsletter}/archive → https://buttondown.com/{newsletter}/rss
const resolveRssUrl = (sourceUrl: string): string => {
  const url = new URL(sourceUrl);
  url.pathname = url.pathname.replace(/\/archive\/?$/, "/rss");
  return url.toString();
};

const buttondownPlugin: BackendFeedPlugin = {
  name: "buttondown",

  canHandle: (sourceUrl) => {
    try {
      const url = new URL(sourceUrl);
      return url.hostname === "buttondown.com" && url.pathname.replace(/\/$/, "").endsWith("/archive");
    } catch {
      return false;
    }
  },

  listItems: async (sourceUrl, fetchFn) => {
    const rssUrl = resolveRssUrl(sourceUrl);
    return fetchAndParseRss(rssUrl, sourceUrl, fetchFn);
  },
};

export default buttondownPlugin;
