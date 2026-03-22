import type { BackendFeedPlugin } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

const plugin: BackendFeedPlugin = {
  name: "centcom",
  canHandle: (url) => url.includes("centcom.mil"),
  listItems: async (sourceUrl, fetchFn, options = {}) => {
    const feedUrl =
      typeof options.feed === "string"
        ? options.feed
        : "https://www.centcom.mil/DesktopModules/ArticleCS/Feed.aspx?ContentType=1&Site=575&isdashboardselected=0&max=12";
    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn, "CENTCOM");
  },
};

export default plugin;
