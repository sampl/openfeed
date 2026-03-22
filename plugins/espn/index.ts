import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "espn",
  canHandle: (url) => url.includes("espn.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://www.espn.com/espn/rss/news";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "ESPN");
  },
};

export default plugin;
