import type { BackendFeedPlugin, PluginFeedItem } from "../types.js";
import { FeedError } from "../types.js";

interface HnHit {
  objectID: string;
  title: string;
  url: string | null;
  created_at: string;
  points: number;
  num_comments: number;
}

interface HnResponse {
  hits: HnHit[];
}

const hackerNewsPlugin: BackendFeedPlugin = {
  name: "hacker-news",
  // Orange square with white Y letterform — Hacker News brand colours
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" fill="#FF6600"/><path d="M4 4 L10 10.5 L16 4 M10 10.5 L10 16" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("news.ycombinator.com"),

  listItems: async (sourceUrl, fetchFn, options = {}): Promise<readonly PluginFeedItem[]> => {
    const limit = typeof options.limit === "number" ? options.limit : 10;

    const fetchUrl = `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${limit}`;
    const response = await fetchFn(fetchUrl);

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limited" : "network_error";
      throw new FeedError(`Failed to fetch Hacker News feed: HTTP ${response.status}`, code);
    }

    const json = (await response.json()) as HnResponse;

    return json.hits.map((hit): PluginFeedItem => {
      // Ask HN and similar posts have no external URL — fall back to HN item page
      const itemUrl = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;

      return {
        sourceName: "Hacker News",
        sourceUrl,
        title: hit.title,
        url: itemUrl,
        publishedAt: new Date(hit.created_at),
        renderData: {
          richText: { text: hit.title },
        },
      };
    });
  },
};

export default hackerNewsPlugin;
