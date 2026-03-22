import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "al-jazeera",
  canHandle: (url) => url.includes("aljazeera.com"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://www.aljazeera.com/xml/rss/all.xml";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "Al Jazeera");
  },
};

export default plugin;
