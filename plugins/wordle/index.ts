import type { BackendFeedPlugin } from "../types.js";
import { FeedError } from "../types.js";

const wordlePlugin: BackendFeedPlugin = {
  name: "wordle",

  canHandle: (sourceUrl) =>
    sourceUrl.includes("nytimes.com") && sourceUrl.includes("wordle"),

  listItems: async (_sourceUrl, _fetchFn) => {
    throw new FeedError(
      "Wordle does not have a public API. See the readme for configuration options.",
      "source_not_found"
    );
  },
};

export default wordlePlugin;
