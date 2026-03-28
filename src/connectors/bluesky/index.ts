import type { BackendFeedPlugin, NewFeedItem } from "../types.js";
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

// Extract the Bluesky handle from a bsky.app/profile/... URL
const extractHandle = (sourceUrl: string): string | null => {
  const match = sourceUrl.match(/\/profile\/([^/?#]+)/);
  return match?.[1] ?? null;
};

// Derive a short title from post text: first line, capped at 80 chars
const titleFromText = (text: string): string => {
  const firstLine = text.split("\n")[0] ?? text;
  return firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
};

const blueskyPlugin: BackendFeedPlugin = {
  name: "bluesky",
  // Sky blue circle with white butterfly wings — Bluesky brand colours
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#0085FF"/><path d="M10 11 C7 8 3 7 4 10 C5 13 8 13 10 11 C12 13 15 13 16 10 C17 7 13 8 10 11Z" fill="white"/></svg>`,

  canHandle: (sourceUrl) => sourceUrl.includes("bsky.app"),

  listItems: async (sourceUrl, fetchFn, options = {}): Promise<readonly NewFeedItem[]> => {
    const handle = extractHandle(sourceUrl);
    if (!handle) {
      throw new FeedError(`Could not extract Bluesky handle from URL: ${sourceUrl}`, "invalid_config");
    }

    const limit = typeof options.limit === "number" ? options.limit : 10;

    const fetchUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${limit}`;
    const response = await fetchFn(fetchUrl);

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limited" : response.status === 401 || response.status === 403 ? "auth_error" : response.status === 404 ? "source_not_found" : "network_error";
      throw new FeedError(`Failed to fetch Bluesky feed: HTTP ${response.status}`, code);
    }

    const json = (await response.json()) as BskyResponse;

    return json.feed.map((entry): NewFeedItem => {
      const { post } = entry;
      const text = post.record.text;
      // The rkey is the last path segment of the AT URI (e.g. at://did:plc:.../app.bsky.feed.post/RKEY)
      const rkey = post.uri.split("/").at(-1) ?? post.uri;
      const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

      return {
        sourceName: `@${handle}`,
        sourceUrl,
        title: titleFromText(text),
        url: postUrl,
        publishedAt: new Date(post.indexedAt),
        renderData: {
          richText: { text },
        },
      };
    });
  },
};

export default blueskyPlugin;
