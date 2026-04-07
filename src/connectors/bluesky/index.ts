import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
import { FeedError } from "../types.js";

interface BskyPost {
  uri: string;
  indexedAt: string;
  record: { text: string };
}

interface BskyFeedEntry {
  post: BskyPost;
}

interface BskyResponse {
  feed: BskyFeedEntry[];
}

const extractHandle = (sourceUrl: string): string | null => {
  const match = sourceUrl.match(/\/profile\/([^/?#]+)/);
  return match?.[1] ?? null;
};

const blueskyPlugin: BackendFeedPlugin = {
  name: "bluesky",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#0085FF"/><path d="M10 11 C7 8 3 7 4 10 C5 13 8 13 10 11 C12 13 15 13 16 10 C17 7 13 8 10 11Z" fill="white"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("bsky.app"),

  listItems: async (sourceUrl, fetchFn, _context, options = {}): Promise<readonly PluginAS2Object[]> => {
    const handle = extractHandle(sourceUrl);
    if (!handle) {
      throw new FeedError(
        `Bluesky URL type not supported: ${sourceUrl}. Only profile pages (bsky.app/profile/...) are supported.`,
        "url_not_supported"
      );
    }

    const limit = typeof options.limit === "number" ? options.limit : 10;

    const fetchUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${limit}`;
    const response = await fetchFn(fetchUrl);

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limited"
        : (response.status === 401 || response.status === 403) ? "auth_error"
        : response.status === 404 ? "source_not_found"
        : "network_error";
      throw new FeedError(`Failed to fetch Bluesky feed: HTTP ${response.status}`, code);
    }

    const json = (await response.json()) as BskyResponse;

    return json.feed.map((entry): PluginAS2Object => {
      const { post } = entry;
      const text = post.record.text;
      const rkey = post.uri.split("/").at(-1) ?? post.uri;
      const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

      return {
        type: "Note",
        // Notes don't have a standalone title — omit name
        summary: text.slice(0, 200) || undefined,
        content: text,
        url: postUrl,
        published: new Date(post.indexedAt),
      };
    });
  },
};

export default blueskyPlugin;
