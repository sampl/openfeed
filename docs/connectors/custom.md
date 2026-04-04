# Writing a connector

You can create and share your own connectors to pull custom sources into OpenFeed.

## Basics

An OpenFeed connector is a TypeScript module that exports a `BackendFeedPlugin` object with the following shape:

```typescript
import type { BackendFeedPlugin, FetchFn, PluginFeedItem } from 'openfeed/connectors/types'

const myConnector: BackendFeedPlugin = {
  name: 'my-connector',
  icon: `<svg>...</svg>`,  // optional SVG icon string

  // Return true if this connector can handle the given URL
  canHandle: (url: string) => url.includes('mysite.com'),

  // Fetch and return items for the given source URL
  listItems: async (
    sourceUrl: string,
    fetchFn: FetchFn,
    options?: Record<string, unknown>
  ): Promise<readonly NewFeedItem[]> => {
    const response = await fetchFn(sourceUrl)
    const data = await response.json()
    return data.items.map(item => ({
      sourceName: 'My Source',
      sourceUrl,
      title: item.title,
      url: item.url,
      publishedAt: new Date(item.date),
      renderData: {
        richText: { text: item.body }
      }
    }))
  }
}

export default myConnector
```

Each item must include at least one render method in `renderData`:

| Method | Data | How it renders |
|---|---|---|
| `video` | `{ videoId?, url? }` | YouTube embed or `<video>` |
| `richText` | `{ html?, text }` | Formatted article content |
| `audio` | `{ url }` | `<audio>` player |
| `embed` | `{ url }` | `<iframe>` fallback |

## Error handling

Throw `FeedError` instead of plain `Error` so OpenFeed can record a structured error code alongside the message. This allows the UI to group errors by type and makes run history easier to interpret.

Import `FeedError` from the types module:

```typescript
import { FeedError } from 'openfeed/connectors/types'
```

| Code | When to use |
|---|---|
| `source_not_found` | The source URL returned a 404 or the resource could not be located |
| `item_not_found` | The source was reachable but a specific item URL was missing |
| `parse_error` | The source was reachable but the content couldn't be parsed |
| `invalid_config` | The user has configured options incorrectly (bad URL shape, wrong option type, unsupported URL) |
| `missing_credential` | A required environment variable or credential option is absent |
| `auth_error` | A credential is present but authentication failed (401/403) |
| `rate_limited` | The source returned a 429 or equivalent rate-limit response |
| `network_error` | A network-level failure occurred (timeout, DNS failure, connection refused, unexpected HTTP status) |
| `unknown` | Catch-all for unexpected errors — used automatically for plain `Error` throws |

```typescript
const apiKey = process.env['MY_API_KEY']
if (!apiKey) {
  throw new FeedError('MY_API_KEY is not set.', 'missing_credential')
}

const response = await fetchFn(sourceUrl)

if (response.status === 404) {
  throw new FeedError(`Source not found: ${sourceUrl}`, 'source_not_found')
}

if (response.status === 401 || response.status === 403) {
  throw new FeedError(`Authentication failed: HTTP ${response.status}`, 'auth_error')
}

if (response.status === 429) {
  throw new FeedError('Rate limited by mysite.com', 'rate_limited')
}

if (!response.ok) {
  throw new FeedError(`Unexpected HTTP ${response.status}`, 'network_error')
}
```

If a connector throws a plain `Error`, OpenFeed records it with code `unknown`. Switching to `FeedError` only adds the structured code.

## Local testing

Write tests using Vitest. Inject a mock `fetchFn` — never hit the network in tests:

```typescript
import { describe, it, expect, vi } from 'vitest'
import myConnector from './index'

describe('myConnector', () => {
  it('handles mysite.com URLs', () => {
    expect(myConnector.canHandle('https://mysite.com/feed')).toBe(true)
    expect(myConnector.canHandle('https://other.com')).toBe(false)
  })

  it('returns items', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [{ title: 'Test', url: 'https://mysite.com/1', date: '2024-01-01', body: 'Hello' }]
      })
    })
    const items = await myConnector.listItems('https://mysite.com', mockFetch)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Test')
  })
})
```

## Loading your connector

### Local file

Point to your connector file in `openfeed.yaml` (relative to the config file):

```yaml
connectors:
  - ./my-connector.js

feeds:
  - name: Main
    sources:
      - name: My Source
        url: https://mysite.com
        connector: my-connector
```

### npm package

Publish your connector and install it on the server, then reference it by package name:

```bash
npm install openfeed-connector-mysite
```

```yaml
connectors:
  - openfeed-connector-mysite

feeds:
  - name: Main
    sources:
      - name: My Source
        url: https://mysite.com
        connector: mysite
```

Name the npm package with the `openfeed-connector-` prefix so others can discover it. We also welcome PRs to include connectors in the built-in connector list.
