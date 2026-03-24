import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "washington-post",
  canHandle: (url) => url.includes("washingtonpost.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://feeds.washingtonpost.com/rss/national";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "The Washington Post");
  },
};

export default plugin;
