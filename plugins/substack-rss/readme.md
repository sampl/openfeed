# substack-rss plugin

Fetches posts from Substack newsletters via their RSS feed.

## Supported URLs

Any URL containing `substack.com`, or bare custom domain Substack URLs (e.g. `https://www.wheresyoured.at`). The plugin appends `/feed` to resolve the RSS feed URL if needed.

## Example config

```yaml
- name: Ed Zitron
  url: https://www.wheresyoured.at

- name: My Newsletter
  url: https://example.substack.com
```

## Render output

Each post produces a `richText` item with the article HTML content and a plain-text fallback.
