# Reuters plugin

Fetches news from Reuters via RSS.

## Supported URL

`https://www.reuters.com`

## Options

- `feed` (string) — override the RSS feed URL. Defaults to `https://feeds.reuters.com/reuters/topNews`.

## Render output

`richText` — HTML and plain-text article summary from the RSS feed.

## Note

Reuters has reduced public RSS access; if the default feed is unavailable, use `options.feed` with an alternative URL.
