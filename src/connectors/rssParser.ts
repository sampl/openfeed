import { XMLParser } from "fast-xml-parser";
import type { PluginAS2Object, AS2Link } from "./types.js";
import { FeedError } from "./types.js";

// Map HTTP status codes to structured error codes
const httpErrorCode = (status: number) => {
  if (status === 404) return "source_not_found" as const;
  if (status === 401 || status === 403) return "auth_error" as const;
  if (status === 429) return "rate_limited" as const;
  return "network_error" as const;
};

// cdataPropName tells the parser to store CDATA content under "__cdata" key.
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

interface RssEnclosure {
  "@_url"?: string;
  "@_type"?: string;
}

interface RssItem {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: string;
  enclosure?: RssEnclosure;
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

// Determine the best AS2 object type for an RSS item.
// Audio items (with an audio enclosure) → Audio; everything else → Article.
const classifyRssItem = (item: RssItem): "Article" | "Audio" => {
  const enclosureType = item.enclosure?.["@_type"] ?? "";
  if (enclosureType.startsWith("audio/")) return "Audio";
  return "Article";
};

const parseRss2Items = (
  channel: NonNullable<NonNullable<RssFeed["rss"]>["channel"]>,
  sourceUrl: string
): readonly PluginAS2Object[] => {
  const rawItems = channel.item ?? [];
  const items: RssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.map((item): PluginAS2Object => {
    const name = extractString(item.title);
    const rawHtml = extractString(item.description);
    const plainText = stripHtml(rawHtml);
    const url = extractString(item.link) || sourceUrl;
    const publishedRaw = item.pubDate ?? new Date().toISOString();
    const objectType = classifyRssItem(item);

    if (objectType === "Audio") {
      const enclosureUrl = item.enclosure?.["@_url"] ?? "";
      const attachment: AS2Link[] = enclosureUrl
        ? [{
            type: "Link",
            href: enclosureUrl,
            mediaType: item.enclosure?.["@_type"] ?? "audio/mpeg",
            rel: "enclosure",
          }]
        : [];

      return {
        type: "Audio",
        name,
        summary: plainText.slice(0, 300) || undefined,
        url,
        attachment: attachment.length > 0 ? attachment : undefined,
        published: new Date(publishedRaw),
      };
    }

    return {
      type: "Article",
      name,
      summary: plainText.slice(0, 300) || undefined,
      content: rawHtml || undefined,
      mediaType: rawHtml ? "text/html" : "text/plain",
      url,
      published: new Date(publishedRaw),
    };
  });
};

const parseAtomItems = (
  feed: NonNullable<AtomFeed["feed"]>,
  _sourceUrl: string
): readonly PluginAS2Object[] => {
  const rawEntries = feed.entry ?? [];
  const entries: AtomEntry[] = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  return entries.map((entry): PluginAS2Object => {
    const name = extractString(entry.title);
    const rawHtml = extractString(entry.content ?? entry.summary);
    const plainText = stripHtml(rawHtml);
    const url = extractAtomLink(entry.link);
    const publishedRaw = entry.published ?? entry.updated ?? new Date().toISOString();

    return {
      type: "Article",
      name,
      summary: plainText.slice(0, 300) || undefined,
      content: rawHtml || undefined,
      mediaType: rawHtml ? "text/html" : "text/plain",
      url,
      published: new Date(publishedRaw),
    };
  });
};

/**
 * Parse an RSS or Atom XML string into PluginAS2Objects.
 * sourceName and sourceUrl are not set here — the framework adds them from context.
 */
export const parseRssFeed = (
  xml: string,
  sourceUrl: string,
): readonly PluginAS2Object[] => {
  const parsed = parser.parse(xml) as RssFeed & AtomFeed;

  if (parsed.rss?.channel) {
    return parseRss2Items(parsed.rss.channel, sourceUrl);
  }

  if (parsed.feed) {
    return parseAtomItems(parsed.feed, sourceUrl);
  }

  throw new FeedError(`Could not parse feed from ${sourceUrl}: unrecognised XML format`, "parse_error");
};

/**
 * Fetch an RSS/Atom feed URL and return parsed PluginAS2Objects.
 */
export const fetchAndParseRss = async (
  feedUrl: string,
  sourceUrl: string,
  fetchFn: typeof fetch,
): Promise<readonly PluginAS2Object[]> => {
  const response = await fetchFn(feedUrl);
  if (!response.ok) {
    throw new FeedError(`Failed to fetch feed: HTTP ${response.status}`, httpErrorCode(response.status));
  }
  const xml = await response.text();
  return parseRssFeed(xml, sourceUrl);
};
