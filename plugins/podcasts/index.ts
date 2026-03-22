import type { BackendFeedPlugin } from "../types.js";
import { FeedError } from "../types.js";
import { fetchAndParseRss } from "../rssParser.js";

// Extract the numeric podcast ID from an Apple Podcasts URL.
// Supports formats like: /id123456 or ?id=123456
const extractApplePodcastId = (url: string): string | null => {
  const match = /\/id(\d+)/.exec(url) ?? /[?&]id=(\d+)/.exec(url);
  return match?.[1] ?? null;
};

interface ItunesLookupResult {
  feedUrl?: string;
}

interface ItunesLookupResponse {
  results: ItunesLookupResult[];
}

const podcastsPlugin: BackendFeedPlugin = {
  name: "podcasts",

  canHandle: (sourceUrl) =>
    sourceUrl.includes("podcasts.apple.com") ||
    sourceUrl.includes("open.spotify.com/show"),

  listItems: async (sourceUrl, fetchFn) => {
    if (sourceUrl.includes("open.spotify.com/show")) {
      throw new FeedError(
        "Spotify podcast URLs are not supported. Please use the podcast's direct RSS feed URL or Apple Podcasts URL.",
        "invalid_config"
      );
    }

    const podcastId = extractApplePodcastId(sourceUrl);
    if (!podcastId) {
      throw new FeedError(
        `Could not extract podcast ID from Apple Podcasts URL: ${sourceUrl}`,
        "invalid_config"
      );
    }

    const lookupUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`;
    const lookupResponse = await fetchFn(lookupUrl);
    if (!lookupResponse.ok) {
      const code = lookupResponse.status === 404 ? "source_not_found" : "network_error";
      throw new FeedError(
        `iTunes lookup failed: HTTP ${lookupResponse.status}`,
        code
      );
    }

    const lookupData = (await lookupResponse.json()) as ItunesLookupResponse;
    const feedUrl = lookupData.results[0]?.feedUrl;
    if (!feedUrl) {
      throw new FeedError(
        `Could not find RSS feed URL for Apple Podcasts ID: ${podcastId}`,
        "item_not_found"
      );
    }

    return fetchAndParseRss(feedUrl, sourceUrl, fetchFn);
  },
};

export default podcastsPlugin;
