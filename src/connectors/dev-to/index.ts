import type { BackendFeedPlugin, PluginFeedItem } from "../types.js";
import { FeedError } from "../types.js";

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  user: { name: string };
}

// Extract a username from a dev.to/@username URL
const extractUsername = (sourceUrl: string): string | null => {
  const match = sourceUrl.match(/dev\.to\/@([^/?#]+)/i);
  return match?.[1] ?? null;
};

// Extract a tag from a dev.to/t/tagname URL
const extractTag = (sourceUrl: string): string | null => {
  const match = sourceUrl.match(/dev\.to\/t\/([^/?#]+)/i);
  return match?.[1] ?? null;
};

const buildFetchUrl = (sourceUrl: string, limit: number): string => {
  const username = extractUsername(sourceUrl);
  if (username) {
    return `https://dev.to/api/articles?username=${username}&per_page=${limit}`;
  }

  const tag = extractTag(sourceUrl);
  if (tag) {
    return `https://dev.to/api/articles?tag=${tag}&per_page=${limit}`;
  }

  // Default: top articles
  return `https://dev.to/api/articles?per_page=${limit}&top=1`;
};

const devToPlugin: BackendFeedPlugin = {
  name: "dev-to",

  canHandle: (sourceUrl) => sourceUrl.includes("dev.to"),

  listItems: async (sourceUrl, fetchFn, options = {}): Promise<readonly PluginFeedItem[]> => {
    const limit = typeof options.limit === "number" ? options.limit : 10;

    const fetchUrl = buildFetchUrl(sourceUrl, limit);
    const response = await fetchFn(fetchUrl);

    if (!response.ok) {
      const code = response.status === 404 ? "source_not_found" : response.status === 429 ? "rate_limited" : "network_error";
      throw new FeedError(`Failed to fetch dev.to feed: HTTP ${response.status}`, code);
    }

    const articles = (await response.json()) as DevToArticle[];

    return articles.map((article): PluginFeedItem => {
      return {
        sourceName: "DEV Community",
        sourceUrl,
        title: article.title,
        description: article.description || undefined,
        url: article.url,
        publishedAt: new Date(article.published_at),
        renderData: {
          richText: { text: article.description || article.title },
        },
      };
    });
  },
};

export default devToPlugin;
