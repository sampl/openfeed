import type { BackendFeedPlugin } from "../types.js";

// Fallback plugin — must be registered last in the plugin registry.
// Sources with no matching plugin produce no feed items.
const defaultPlugin: BackendFeedPlugin = {
  name: "default",

  // Always returns true so it catches every unmatched source
  canHandle: (_sourceUrl) => true,

  listItems: async (sourceUrl, _fetchFn) => {
    console.warn(
      `[openfeed] No plugin found for source: ${sourceUrl}. No items will be fetched.`
    );
    return [];
  },
};

export default defaultPlugin;
