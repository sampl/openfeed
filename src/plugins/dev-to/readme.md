# dev-to plugin

Fetches articles from DEV Community (dev.to) via the public DEV API.

## Supported URL formats

- `https://dev.to` — top articles across the platform
- `https://dev.to/@username` — articles by a specific user
- `https://dev.to/t/tagname` — articles with a specific tag

## Options

- `limit` (number, default `10`) — number of articles to fetch

## Render output

Each item uses `richText` with the article description as plain text, falling back to the title if no description is available.
