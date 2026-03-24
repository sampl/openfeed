import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "politico",
  canHandle: (url) => url.includes("politico.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://www.politico.com/rss/politicopicks.xml";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "Politico");
  },
};

export default plugin;
