import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
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
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" fill="#FF6600"/><path d="M4 4 L10 10.5 L16 4 M10 10.5 L10 16" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("news.ycombinator.com"),

  listItems: async (_sourceUrl, fetchFn, _context, options = {}): Promise<readonly PluginAS2Object[]> => {
    const limit = typeof options.limit === "number" ? options.limit : 10;

    const fetchUrl = `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${limit}`;
    const response = await fetchFn(fetchUrl);

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limited" : "network_error";
      throw new FeedError(`Failed to fetch Hacker News feed: HTTP ${response.status}`, code);
    }

    const json = (await response.json()) as HnResponse;

    return json.hits.map((hit): PluginAS2Object => {
      const itemUrl = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;

      return {
        type: "Article",
        name: hit.title,
        url: itemUrl,
        published: new Date(hit.created_at),
      };
    });
  },
};

export default hackerNewsPlugin;
