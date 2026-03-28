# Medium plugin

Fetches articles from Medium via RSS.

## Supported URL

`https://medium.com` or `https://medium.com/@username`

When a username is detected in the URL (e.g. `medium.com/@johndoe`), the plugin subscribes to that user's feed and sets the source name to `Medium - @johndoe`. Without a username, it falls back to the generic Medium feed.

## Options

- `feed` (string) — override the RSS feed URL entirely, e.g. `https://medium.com/feed/tag/typescript` for a tag feed.

## Render output

`richText` — HTML and plain-text article summary from the RSS feed.
