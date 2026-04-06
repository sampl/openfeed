import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
import { FeedError } from "../types.js";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    permalink: string;
    url: string;
    score: number;
    author: string;
    created_utc: number;
    is_self: boolean;
    thumbnail?: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

const extractSubreddit = (sourceUrl: string): string => {
  const match = sourceUrl.match(/reddit\.com\/r\/([^/?#]+)/i);
  if (!match?.[1]) throw new FeedError(
    `Reddit URL type not supported: ${sourceUrl}. Only subreddit pages (reddit.com/r/...) are supported.`,
    "url_not_supported"
  );
  return match[1];
};

const buildFetchUrl = (subreddit: string, sort: string, time: string, limit: number): string => {
  const params = new URLSearchParams({ t: time, limit: String(limit) });
  return `https://www.reddit.com/r/${subreddit}/${sort}.json?${params.toString()}`;
};

const redditPlugin: BackendFeedPlugin = {
  name: "reddit",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#FF4500"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("reddit.com"),

  listItems: async (sourceUrl, fetchFn, _context, options = {}): Promise<readonly PluginAS2Object[]> => {
    const subreddit = extractSubreddit(sourceUrl);

    const sort = typeof options.sort === "string" ? options.sort : "top";
    const time = typeof options.time === "string" ? options.time : "week";
    const limit = typeof options.limit === "number" ? options.limit : 5;

    const fetchUrl = buildFetchUrl(subreddit, sort, time, limit);

    const response = await fetchFn(fetchUrl, {
      headers: { "User-Agent": "openfeed/1.0" },
    } as RequestInit);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new FeedError(
        `Reddit returned a non-JSON response (rate-limited or blocked). Status: ${response.status}`,
        "rate_limited"
      );
    }

    const json = (await response.json()) as RedditResponse;
    const posts = json.data.children;

    return posts.map((post): PluginAS2Object => {
      const { data } = post;
      const postUrl = `https://www.reddit.com${data.permalink}`;
      const summary = data.selftext.slice(0, 300) || undefined;

      return {
        type: "Article",
        name: data.title,
        summary,
        url: postUrl,
        published: new Date(data.created_utc * 1000),
      };
    });
  },
};

export default redditPlugin;
