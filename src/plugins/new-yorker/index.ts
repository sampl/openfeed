import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "new-yorker",
  canHandle: (url) => url.includes("newyorker.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://www.newyorker.com/feed/everything";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "The New Yorker");
  },
};

export default plugin;
