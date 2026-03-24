/**
 * Shared test fixtures and helpers for plugin and integration tests.
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

/** RSS 2.0 feed with multiple items for pagination/limit testing. */
export const SAMPLE_RSS2_MULTI_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Multi-Item Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <description>First article content</description>
      <pubDate>Mon, 15 Jan 2024 12:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <description>Second article content</description>
      <pubDate>Mon, 15 Jan 2024 08:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Article Three</title>
      <link>https://example.com/article-3</link>
      <description>Third article content</description>
      <pubDate>Sun, 14 Jan 2024 20:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

/** Minimal valid Atom feed document with one entry. */
export const SAMPLE_ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com"/>
  <entry>
    <title>Test Entry</title>
    <link href="https://example.com/entry-1"/>
    <summary>Entry summary text</summary>
    <published>2024-01-15T10:00:00Z</published>
  </entry>
</feed>`;

/**
 * Valid XML that is neither RSS 2.0 nor Atom — triggers parse_error in
 * rssParser.parseRssFeed() because it matches neither parsed.rss nor parsed.feed.
 * Using a recognizable non-feed format (OPML) keeps fast-xml-parser happy while
 * still exercising the "unrecognised XML format" branch.
 */
export const MALFORMED_XML = `<?xml version="1.0"?>
<opml version="2.0"><head><title>Not A Feed</title></head><body/></opml>`;

/** Valid XML that is neither RSS nor Atom (triggers parse_error in rssParser). */
export const UNRECOGNIZED_XML = `<?xml version="1.0"?>
<opml version="2.0"><head><title>Unrecognized</title></head></opml>`;

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

// ─── Canonical Error Response Fixtures ───────────────────────────────────────

/** 404 Not Found */
export const NOT_FOUND_RESPONSE     = makeErrorResponse(404);
/** 401 Unauthorized */
export const UNAUTHORIZED_RESPONSE  = makeErrorResponse(401);
/** 403 Forbidden */
export const FORBIDDEN_RESPONSE     = makeErrorResponse(403);
/** 429 Too Many Requests */
export const RATE_LIMITED_RESPONSE  = makeErrorResponse(429);
/** 500 Internal Server Error */
export const SERVER_ERROR_RESPONSE  = makeErrorResponse(500);
/** 503 Service Unavailable */
export const SERVICE_UNAVAILABLE_RESPONSE = makeErrorResponse(503);

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

/** Reddit API listing response (one post). */
export const SAMPLE_REDDIT_RESPONSE = {
  data: {
    children: [
      {
        data: {
          id: "abc123",
          title: "Interesting post on Reddit",
          url: "https://example.com/reddit-link",
          permalink: "/r/programming/comments/abc123/interesting_post/",
          selftext: "Post body text here",
          created_utc: 1705312800,
          score: 1500,
          num_comments: 230,
          subreddit: "programming",
          author: "redditor_one",
        },
      },
    ],
  },
};

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

/** Dev.to articles API response (two articles). */
export const SAMPLE_DEVTO_RESPONSE = [
  {
    id: 1001,
    title: "Getting started with TypeScript",
    description: "A beginner's guide to TypeScript",
    url: "https://dev.to/user1/getting-started-typescript-abc",
    published_at: "2024-01-15T10:00:00.000Z",
    user: { name: "Dev Author" },
  },
  {
    id: 1002,
    title: "Advanced React Patterns",
    description: "Deep dive into React patterns",
    url: "https://dev.to/user2/advanced-react-patterns-def",
    published_at: "2024-01-14T08:00:00.000Z",
    user: { name: "React Expert" },
  },
];

/** Open-Meteo current weather response. */
export const SAMPLE_OPEN_METEO_RESPONSE = {
  current: {
    temperature_2m: 8.5,
    wind_speed_10m: 12.3,
    weather_code: 3,
    time: "2024-01-15T10:00",
  },
  hourly: {
    time: ["2024-01-15T00:00", "2024-01-15T01:00"],
    temperature_2m: [7.0, 7.5],
    precipitation_probability: [0, 5],
  },
};

/** Firecrawl scrape API response (used by Instagram plugin). */
export const SAMPLE_FIRECRAWL_RESPONSE = {
  success: true,
  data: {
    markdown: "**Post caption here** - some hashtags\n\n#example #test",
    metadata: {
      title: "Test Instagram post",
      ogImage: "https://example.com/image.jpg",
    },
  },
};
