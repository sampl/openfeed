import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "reuters",
  canHandle: (url) => url.includes("reuters.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://feeds.reuters.com/reuters/topNews";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "Reuters");
  },
};

export default plugin;
