import type { BackendFeedPlugin } from "../types.js";

// Fallback plugin — must be registered last in the plugin registry.
const defaultPlugin: BackendFeedPlugin = {
  name: "default",

  canHandle: (_sourceUrl) => true,

  listItems: async (sourceUrl, _fetchFn) => {
    console.warn(
      `[openfeed] No plugin found for source: ${sourceUrl}. No items will be fetched.`
    );
    return [];
  },
};

export default defaultPlugin;
