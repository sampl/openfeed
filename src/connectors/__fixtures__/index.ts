/**
 * Shared test fixtures and helpers for connector and integration tests.
 *
 * Provides canonical XML samples, JSON response samples, and mock fetch
 * response factory functions so every test file uses the same data shapes.
 */

// ─── XML Feed Fixtures ───────────────────────────────────────────────────────

/** Minimal valid RSS 2.0 document with one item. */
export const SAMPLE_RSS2_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article-1</link>
      <description>&lt;p&gt;Test content here&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2024 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

/**
 * Valid XML that is neither RSS 2.0 nor Atom — triggers parse_error in
 * rssParser.parseRssFeed() because it matches neither parsed.rss nor parsed.feed.
 * Using a recognizable non-feed format (OPML) keeps fast-xml-parser happy while
 * still exercising the "unrecognised XML format" branch.
 */
export const MALFORMED_XML = `<?xml version="1.0"?>
<opml version="2.0"><head><title>Not A Feed</title></head><body/></opml>`;

// ─── Mock Response Factories ─────────────────────────────────────────────────

/**
 * Create a mock Response whose .text() returns the given string.
 * ok is true when status < 400.
 */
export const makeTextResponse = (text: string, status = 200): Response =>
  ({
    ok: status < 400,
    status,
    text: async () => text,
    json: async () => { throw new Error("Response is not JSON"); },
  }) as unknown as Response;

/**
 * Create a mock Response whose .json() returns the given body.
 * ok is true when status < 400.
 */
export const makeJsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

/**
 * Create a mock error Response (ok: false) with empty body.
 * Use for 4xx / 5xx status codes.
 */
export const makeErrorResponse = (status: number): Response =>
  ({
    ok: false,
    status,
    text: async () => "",
    json: async () => ({}),
  }) as unknown as Response;

// ─── JSON API Fixtures ────────────────────────────────────────────────────────

/** Hacker News Algolia search result (one hit). */
export const SAMPLE_HN_RESPONSE = {
  hits: [
    {
      objectID: "39123456",
      title: "Show HN: Something interesting",
      url: "https://example.com/interesting",
      created_at: "2024-01-15T10:00:00.000Z",
      points: 200,
      num_comments: 80,
    },
  ],
};

/** GitHub issues list response (one issue). */
export const SAMPLE_GITHUB_ISSUES_RESPONSE = [
  {
    number: 42,
    title: "Fix the thing",
    html_url: "https://github.com/owner/repo/issues/42",
    body: "This issue describes a bug.",
    created_at: "2024-01-15T10:00:00Z",
    user: { login: "octocat" },
    labels: [],
    state: "open",
  },
];

/** Bluesky getAuthorFeed response (one post). */
export const SAMPLE_BLUESKY_RESPONSE = {
  feed: [
    {
      post: {
        uri: "at://did:plc:abc123/app.bsky.feed.post/rkey001",
        cid: "bafyreia",
        author: {
          handle: "user.bsky.social",
          displayName: "Test User",
        },
        record: {
          text: "Hello from Bluesky! This is a test post.",
          createdAt: "2024-01-15T10:00:00.000Z",
        },
        indexedAt: "2024-01-15T10:00:00.000Z",
      },
    },
  ],
};
