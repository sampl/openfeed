import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "wall-street-journal",
  canHandle: (url) => url.includes("wsj.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://feeds.a.dj.com/rss/RSSWorldNews.xml";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "The Wall Street Journal");
  },
};

export default plugin;
