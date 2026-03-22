# instagram-firecrawl plugin

Fetches recent posts from an Instagram profile using the [Firecrawl](https://firecrawl.dev) web scraping API.

## Requirements

Requires a `FIRECRAWL_API_KEY` environment variable to be set.

## Supported URLs

Any URL containing `instagram.com`.

## Example config

```yaml
- name: Brooklyn Academy of Music
  url: https://www.instagram.com/brooklynacademy/
  fetchMode: replace
```

Using `fetchMode: replace` is recommended so only the latest snapshot of the profile is kept.

## Render output

Produces a single item per fetch with:

- `embed` render method — embeds the Instagram profile in an `<iframe>`
- `richText` fallback — shows the scraped markdown content
