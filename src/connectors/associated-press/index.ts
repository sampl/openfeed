import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "associated-press",
  canHandle: (url) => url.includes("apnews.com"),
  listItems: async (sourceUrl, fetchFn, _context, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://feeds.apnews.com/apnews/topnews";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn);
  },
};

export default plugin;
