// Render method data shapes — plugins populate whichever methods they support
export interface VideoRenderData {
  readonly videoId?: string;
  readonly url?: string;
}

export interface RichTextRenderData {
  readonly html?: string;
  readonly text: string; // required plain text fallback
}

export interface AudioRenderData {
  readonly url: string;
}

export interface EmbedRenderData {
  readonly url: string;
}

// Discriminated union: at least one render method is required.
// TypeScript will error at compile time if none are provided.
export type FeedItemRenderData =
  | {
      video: VideoRenderData;
      richText?: RichTextRenderData;
      audio?: AudioRenderData;
      embed?: EmbedRenderData;
    }
  | {
      video?: VideoRenderData;
      richText: RichTextRenderData;
      audio?: AudioRenderData;
      embed?: EmbedRenderData;
    }
  | {
      video?: VideoRenderData;
      richText?: RichTextRenderData;
      audio: AudioRenderData;
      embed?: EmbedRenderData;
    }
  | {
      video?: VideoRenderData;
      richText?: RichTextRenderData;
      audio?: AudioRenderData;
      embed: EmbedRenderData;
    };

// Shape returned by plugin.listItems — does not include DB-managed fields
export interface NewFeedItem {
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly feedName?: string;
  readonly title: string;
  readonly description?: string;
  readonly url: string; // used as deduplication key
  readonly publishedAt: Date;
  readonly renderData: FeedItemRenderData;
}

// Shape stored in DB and served to the frontend.
// sourceIconUrl is not stored in DB — it is attached by the items API at response time.
export interface FeedItem extends NewFeedItem {
  readonly id: string;
  readonly status: "unread" | "archived" | "read-later" | "expired";
  readonly createdAt: Date;
  readonly sourceIconUrl?: string;
}

// API-serialized version of FeedItem: Date fields become ISO strings over JSON.
// Use this type on the frontend when working with items fetched from the API.
export interface ApiFeedItem extends Omit<FeedItem, "publishedAt" | "createdAt"> {
  readonly publishedAt: string;
  readonly createdAt: string;
}

// Shared API response types — used by both the server routes and the frontend API client.

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
  readonly startedAt: string; // ISO string from JSON serialization
  readonly completedAt?: string;
  readonly status: "running" | "success" | "error";
  readonly errorMessage?: string;
  readonly sourceResults: readonly SourceResult[];
}

export interface PaginatedItemsResponse {
  readonly items: ApiFeedItem[];
  readonly hasMore: boolean;
  readonly total: number;
}

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

// Structured error codes plugins should use instead of plain Error throws.
// The fetcher captures these codes and stores them on SourceResult for UI grouping.
export type FeedErrorCode =
  | "source_not_found"   // Source URL returned 404 or could not be reached
  | "item_not_found"     // Source reachable but expected item URL was missing
  | "parse_error"        // Source reachable but content couldn't be parsed
  | "invalid_config"     // User misconfigured options (bad URL shape, wrong option type, etc.)
  | "missing_credential" // A required env-var credential is absent
  | "auth_error"         // Credential present but authentication failed (401/403)
  | "rate_limited"       // Source returned 429 or equivalent
  | "network_error"      // Network-level failure (timeout, DNS, connection refused)
  | "unknown";           // Catch-all for unexpected errors

// Plugins should throw this instead of plain Error so the fetcher can record a structured code.
export class FeedError extends Error {
  readonly code: FeedErrorCode;
  constructor(message: string, code: FeedErrorCode) {
    super(message);
    this.name = "FeedError";
    this.code = code;
  }
}

// Inject fetch so plugins are unit-testable without hitting the network
export type FetchFn = typeof fetch;

// Every plugin must implement this interface.
// TypeScript errors at compile time if canHandle or listItems have wrong signatures.
export interface BackendFeedPlugin {
  readonly name: string;
  // Raw SVG string for this source's icon. The server converts it to a data URI.
  readonly icon?: string;
  readonly canHandle: (sourceUrl: string) => boolean;
  readonly listItems: (
    sourceUrl: string,
    fetchFn: FetchFn,
    options?: Record<string, unknown>
  ) => Promise<readonly NewFeedItem[]>;
}
