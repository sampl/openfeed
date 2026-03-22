# rss plugin

Fetches articles from RSS 2.0 and Atom feeds.

## Supported URLs

URLs that match any of these patterns:

- Path ends with `/feed`, `/feed/`, `/rss`, `/atom`, or `.xml`
- Hostname starts with `feeds.` or `rss.`

## Example config

```yaml
- name: New York Times
  url: https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml
```

## Notes

- CDATA-wrapped fields (used by some publishers like the NYT) are handled correctly
- HTML content in descriptions is preserved for `richText` rendering; a plain-text fallback is also produced
- Both RSS 2.0 (`<rss>` root) and Atom (`<feed>` root) formats are supported

## Render output

Each article produces a `richText` item with the full HTML description and a plain-text fallback.
