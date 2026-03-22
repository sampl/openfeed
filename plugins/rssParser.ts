import { XMLParser } from "fast-xml-parser";
import type { NewFeedItem } from "./types.js";
import { FeedError } from "./types.js";

// Map HTTP status codes to structured error codes
const httpErrorCode = (status: number) => {
  if (status === 404) return "source_not_found" as const;
  if (status === 401 || status === 403) return "auth_error" as const;
  if (status === 429) return "rate_limited" as const;
  return "network_error" as const;
};

// cdataPropName tells the parser to store CDATA content under "__cdata" key.
// NYT and some other feeds wrap titles/descriptions in CDATA sections.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
});

// Strip HTML tags to produce a plain-text fallback
export const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

// Extract a plain string from either a raw string or a CDATA-wrapped object
export const extractString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "__cdata" in value) {
    return String((value as Record<string, unknown>)["__cdata"] ?? "");
  }
  return "";
};

// Atom <link> elements may be an object with @_href or a plain string
const extractAtomLink = (link: unknown): string => {
  if (typeof link === "string") return link;
  if (typeof link === "object" && link !== null && "@_href" in link) {
    return (link as Record<string, string>)["@_href"] ?? "";
  }
  return "";
};

// --- RSS 2.0 types ---

interface RssItem {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: string;
}

interface RssFeed {
  rss?: { channel?: { item?: RssItem | RssItem[]; title?: unknown } };
}

// --- Atom types ---

interface AtomEntry {
  title?: unknown;
  link?: unknown;
  summary?: unknown;
  content?: unknown;
  published?: string;
  updated?: string;
}

interface AtomFeed {
  feed?: { entry?: AtomEntry | AtomEntry[]; title?: unknown };
}

const parseRss2Items = (
  channel: NonNullable<NonNullable<RssFeed["rss"]>["channel"]>,
  sourceUrl: string,
  sourceName?: string
): readonly NewFeedItem[] => {
  const name = sourceName ?? extractString(channel.title) ?? new URL(sourceUrl).hostname;
  const rawItems = channel.item ?? [];
  const items: RssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.map((item): NewFeedItem => {
    const title = extractString(item.title);
    const rawHtml = extractString(item.description);
    const plainText = stripHtml(rawHtml);
    const url = extractString(item.link) || sourceUrl;
    const publishedRaw = item.pubDate ?? new Date().toISOString();

    return {
      sourceName: name,
      sourceUrl,
      title,
      description: plainText.slice(0, 300),
      url,
      publishedAt: new Date(publishedRaw),
      renderData: {
        richText: { html: rawHtml, text: plainText },
      },
    };
  });
};

const parseAtomItems = (
  feed: NonNullable<AtomFeed["feed"]>,
  sourceUrl: string,
  sourceName?: string
): readonly NewFeedItem[] => {
  const name = sourceName ?? extractString(feed.title) ?? new URL(sourceUrl).hostname;
  const rawEntries = feed.entry ?? [];
  const entries: AtomEntry[] = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  return entries.map((entry): NewFeedItem => {
    const title = extractString(entry.title);
    const rawHtml = extractString(entry.content ?? entry.summary);
    const plainText = stripHtml(rawHtml);
    const url = extractAtomLink(entry.link);
    const publishedRaw = entry.published ?? entry.updated ?? new Date().toISOString();

    return {
      sourceName: name,
      sourceUrl,
      title,
      description: plainText.slice(0, 300),
      url,
      publishedAt: new Date(publishedRaw),
      renderData: {
        richText: { html: rawHtml, text: plainText },
      },
    };
  });
};

// Parse an RSS or Atom XML string into feed items.
// Pass sourceName to override the feed's own title (used by named plugins).
export const parseRssFeed = (
  xml: string,
  sourceUrl: string,
  sourceName?: string
): readonly NewFeedItem[] => {
  const parsed = parser.parse(xml) as RssFeed & AtomFeed;

  if (parsed.rss?.channel) {
    return parseRss2Items(parsed.rss.channel, sourceUrl, sourceName);
  }

  if (parsed.feed) {
    return parseAtomItems(parsed.feed, sourceUrl, sourceName);
  }

  throw new FeedError(`Could not parse feed from ${sourceUrl}: unrecognised XML format`, "parse_error");
};

// Fetch an RSS/Atom feed URL and return parsed items.
export const fetchAndParseRss = async (
  feedUrl: string,
  sourceUrl: string,
  fetchFn: typeof fetch,
  sourceName?: string
): Promise<readonly NewFeedItem[]> => {
  const response = await fetchFn(feedUrl);
  if (!response.ok) {
    throw new FeedError(`Failed to fetch feed: HTTP ${response.status}`, httpErrorCode(response.status));
  }
  const xml = await response.text();
  return parseRssFeed(xml, sourceUrl, sourceName);
};
