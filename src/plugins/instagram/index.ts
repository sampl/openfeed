import type { BackendFeedPlugin, NewFeedItem } from "../types.js";
import { FeedError } from "../types.js";

interface FirecrawlResponse {
  success: boolean;
  data: {
    markdown: string;
    html: string;
  };
}

// Extract the username path segment from an Instagram profile URL
const extractUsername = (sourceUrl: string): string => {
  const url = new URL(sourceUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments[0] ?? "unknown";
};

const instagramFirecrawlPlugin: BackendFeedPlugin = {
  name: "instagram",

  canHandle: (sourceUrl) => sourceUrl.includes("instagram.com"),

  listItems: async (sourceUrl, fetchFn): Promise<readonly NewFeedItem[]> => {
    const apiKey = process.env["FIRECRAWL_API_KEY"];
    if (!apiKey) {
      throw new FeedError(
        "FIRECRAWL_API_KEY is not set. Instagram sources require a Firecrawl API key.",
        "missing_credential"
      );
    }

    const response = await fetchFn("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url: sourceUrl, formats: ["markdown", "html"] }),
    });

    const json = (await response.json()) as FirecrawlResponse;
    const scrapedMarkdown = json.data?.markdown ?? "";
    const username = extractUsername(sourceUrl);
    const sourceName = `@${username}`;

    // One item per day — date suffix acts as the dedup key
    const dateStamp = new Date().toISOString().slice(0, 10);

    const item: NewFeedItem = {
      sourceName,
      sourceUrl,
      title: `Recent posts from ${sourceName}`,
      url: `${sourceUrl}#${dateStamp}`,
      publishedAt: new Date(),
      renderData: {
        embed: { url: sourceUrl },
        richText: { text: scrapedMarkdown.slice(0, 500) },
      },
    };

    return [item];
  },
};

export default instagramFirecrawlPlugin;
