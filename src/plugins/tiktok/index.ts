import type { BackendFeedPlugin } from "../types.js";
import { FeedError } from "../types.js";

const tiktokPlugin: BackendFeedPlugin = {
  name: "tiktok",

  canHandle: (sourceUrl) => sourceUrl.includes("tiktok.com"),

  listItems: async (_sourceUrl, _fetchFn) => {
    throw new FeedError(
      "TikTok does not have a public API. See the readme for alternatives.",
      "source_not_found"
    );
  },
};

export default tiktokPlugin;
