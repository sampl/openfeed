import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "cnn",
  canHandle: (url) => url.includes("cnn.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://rss.cnn.com/rss/edition.rss";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "CNN");
  },
};

export default plugin;
