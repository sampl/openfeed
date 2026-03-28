import type { BackendFeedPlugin } from "../types.js";
import { FeedError } from "../types.js";

const gmailPlugin: BackendFeedPlugin = {
  name: "gmail",

  canHandle: (sourceUrl) =>
    sourceUrl.includes("mail.google.com") || sourceUrl.includes("gmail.com"),

  listItems: async (_sourceUrl, _fetchFn) => {
    throw new FeedError(
      "Gmail requires OAuth configuration. See readme for setup instructions.",
      "missing_credential"
    );
  },
};

export default gmailPlugin;
