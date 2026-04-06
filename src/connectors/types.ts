// ---------------------------------------------------------------------------
// ActivityStreams 2.0 core types
// ---------------------------------------------------------------------------

/** An AS2 Link — used in attachment[] to reference external media. */
export interface AS2Link {
  readonly type: "Link";
  readonly href: string;
  readonly mediaType?: string; // e.g. "video/mp4", "audio/mpeg", "text/html"
  readonly rel?: string;       // e.g. "video", "enclosure", "alternate"
  readonly name?: string;      // display label
}

/** A hashtag or mention tag — used in tag[] on social posts. */
export interface AS2Tag {
  readonly type: "Hashtag" | "Mention";
  readonly name: string;  // e.g. "#rust" or "@user@domain"
  readonly href?: string; // canonical URL for the tag, if available
}

/** AS2 Object types supported by the frontend. */
export type AS2ObjectType = "Note" | "Article" | "Video" | "Audio" | "Event" | "Page";

/**
 * An AS2 Object — what a piece of content is.
 * Stored in the `objects` table; returned by the API nested inside the feed.
 *
 * Type guide:
 *  Note    — short-form text without a meaningful standalone title
 *            (social posts, weather updates, short status items)
 *  Article — long-form content with a real headline
 *            (RSS articles, blog posts, news stories, HN posts)
 *  Video   — video content; attachment[] holds the embed link
 *            (YouTube, TikTok)
 *  Audio   — audio content; attachment[] holds the enclosure URL
 *            (Podcasts)
 *  Event   — calendar event
 *            (Google Calendar)
 *  Page    — generic web page / iframe embed
 *            (anything best shown in an iframe)
 */
export interface AS2Object {
  readonly id: string;
  readonly type: AS2ObjectType;
  readonly name?: string;           // title; omit for Note
  readonly summary?: string;        // short description / teaser
  readonly content?: string;        // full HTML/markdown/plain body
  readonly mediaType?: string;      // content media type; defaults to "text/html"
  readonly url: string;             // canonical URL; used as dedup key
  readonly attachment?: AS2Link[];  // media links (video embed, audio enclosure, etc.)
  readonly published?: string;      // ISO 8601 publication date from source
  // Relational AS2 fields — available for connectors that need them
  readonly inReplyTo?: AS2Link;           // for reply threads (social media)
  readonly tag?: (AS2Link | AS2Tag)[];    // hashtags, mentions
  readonly context?: AS2Link;            // conversation/thread grouping
  // Framework-managed fields (never set by plugins)
  readonly sourceName: string;      // display name from YAML config
  readonly sourceUrl: string;       // source URL from YAML config
  readonly feedName?: string;       // logical feed grouping from YAML config
  readonly sourceIconUrl?: string;  // injected at response time from plugin.icon
}

// ---------------------------------------------------------------------------
// AS2 Activity types
// ---------------------------------------------------------------------------

/** Activity types used by OpenFeed. */
export type AS2ActivityType = "Create" | "Read" | "Add";

/** An AS2 Activity — what happened to an object. */
export interface AS2Activity {
  readonly id: string;
  readonly type: AS2ActivityType;
  readonly object: AS2Object;
  readonly target?: { readonly type: "Collection"; readonly name: "read-later" };
  readonly published: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/**
 * Paginated list of objects returned by GET /api/objects.
 * The field is intentionally "items" (not "objects") for consistency with
 * the rest of the API and minimal frontend churn.
 */
export interface PaginatedObjectsResponse {
  readonly items: AS2Object[];
  readonly hasMore: boolean;
  readonly total: number;
}

// ---------------------------------------------------------------------------
// Plugin interface
// ---------------------------------------------------------------------------

/**
 * What plugins return — full AS2 expressiveness with only `type` and `url`
 * required. Framework-owned fields (id, sourceName, sourceUrl, feedName,
 * sourceIconUrl) are NEVER set by plugins; they come from the YAML config
 * via the `context` parameter passed to listItems().
 *
 * `published` is a Date here for convenience; the framework converts it to
 * an ISO string before storing.
 *
 * Any valid AS2 property beyond the declared fields can be included via the
 * index signature — e.g. inReplyTo, tag, context for social connectors.
 * Unknown properties are serialised into the `extras` JSON column and
 * deserialised back onto AS2Object at response time, transparently.
 */
export interface PluginAS2Object {
  readonly type: AS2ObjectType;
  readonly url: string;            // canonical URL; dedup key
  readonly published?: Date;       // Date for convenience; framework converts to ISO
  readonly name?: string;
  readonly summary?: string;
  readonly content?: string;
  readonly mediaType?: string;
  readonly attachment?: AS2Link[];
  readonly inReplyTo?: AS2Link;
  readonly tag?: (AS2Link | AS2Tag)[];
  readonly context?: AS2Link;
  readonly [key: string]: unknown; // any additional valid AS2 property
}

/**
 * Source provenance passed to every plugin — comes entirely from the YAML
 * config, never from the plugin itself.
 */
export interface PluginContext {
  readonly sourceName: string;  // the `name:` field from openfeed.yaml
  readonly sourceUrl: string;   // the `url:` field from openfeed.yaml
  readonly feedName?: string;   // the containing feed name
}

/**
 * Every content-source plugin must implement this interface.
 * Plugins are registered in pluginRegistry.ts; the first plugin whose
 * canHandle() returns true for a given source URL is used.
 */
export interface BackendFeedPlugin {
  readonly name: string;
  /** Raw SVG markup for this source's icon. Encoded as a data URI at response time. */
  readonly icon?: string;
  /** Returns true if this plugin knows how to fetch `sourceUrl`. */
  readonly canHandle: (sourceUrl: string) => boolean;
  /**
   * Fetches and returns objects for `sourceUrl`.
   * @param fetchFn  - Injected fetch function for unit-testability.
   * @param context  - Source provenance from YAML config (sourceName, sourceUrl, feedName).
   * @param options  - Plugin-specific options declared in the user's YAML config.
   */
  readonly listItems: (
    sourceUrl: string,
    fetchFn: FetchFn,
    context: PluginContext,
    options?: Record<string, unknown>
  ) => Promise<readonly PluginAS2Object[]>;
}

/** Inject fetch so plugins are unit-testable without hitting the network. */
export type FetchFn = typeof fetch;

// ---------------------------------------------------------------------------
// Run / source result types (unchanged)
// ---------------------------------------------------------------------------

export interface SourceResult {
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly newItemsCount: number;
  readonly status: "success" | "error" | "skipped";
  readonly errorMessage?: string;
  readonly errorCode?: FeedErrorCode;
}

export interface FetchRun {
  readonly id: string;
  readonly triggeredBy: "schedule" | "manual";
  readonly startedAt: string;  // ISO string from JSON serialisation
  readonly completedAt?: string;
  readonly status: "running" | "success" | "error";
  readonly errorMessage?: string;
  readonly sourceResults: readonly SourceResult[];
}

// ---------------------------------------------------------------------------
// Time tracking types (unchanged)
// ---------------------------------------------------------------------------

export interface TimeLimitEntry {
  readonly daily?: number;  // minutes
  readonly weekly?: number; // minutes
}

export interface TimeLimitsResponse {
  readonly global: TimeLimitEntry | null;
  readonly byFeed: Record<string, TimeLimitEntry>;
}

export interface TimeUsageResponse {
  readonly byFeed: Record<string, number>; // minutes
  readonly total: number;                  // minutes
}

// ---------------------------------------------------------------------------
// Structured error types (unchanged)
// ---------------------------------------------------------------------------

export type FeedErrorCode =
  | "source_not_found"
  | "item_not_found"
  | "parse_error"
  | "invalid_config"
  | "url_not_supported"
  | "missing_credential"
  | "auth_error"
  | "rate_limited"
  | "network_error"
  | "unknown";

export const FEED_ERROR_CODES: readonly FeedErrorCode[] = [
  "source_not_found",
  "item_not_found",
  "parse_error",
  "invalid_config",
  "url_not_supported",
  "missing_credential",
  "auth_error",
  "rate_limited",
  "network_error",
  "unknown",
];

/**
 * Plugins should throw this instead of a plain Error so the fetcher can
 * store a structured error code on the run's SourceResult for UI display.
 */
export class FeedError extends Error {
  readonly code: FeedErrorCode;
  constructor(message: string, code: FeedErrorCode) {
    super(message);
    this.name = "FeedError";
    this.code = code;
  }
}
