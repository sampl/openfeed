# Podcasts plugin

Fetches podcast episodes from Apple Podcasts URLs by resolving the RSS feed via the iTunes lookup API.

## Supported URL formats

- Apple Podcasts: `https://podcasts.apple.com/*/podcast/*/id{ID}`

Spotify show URLs (`open.spotify.com/show/...`) are recognized by `canHandle` but will throw an error — Spotify does not provide a public RSS feed.

## How it works

For Apple Podcasts URLs, the plugin:

1. Extracts the numeric podcast ID from the URL
2. Calls the iTunes lookup API to find the podcast's RSS feed URL
3. Fetches and parses the RSS feed

## Direct RSS feeds work better

If you have the podcast's direct RSS feed URL, use the `rss` connector instead — it skips the iTunes lookup and works for any podcast:

```yaml
- name: My Podcast
  url: https://feeds.example.com/my-podcast.rss
  connector: rss
```

## Apple Podcasts example

```yaml
- name: My Podcast
  url: https://podcasts.apple.com/us/podcast/my-podcast/id123456789
```

## Output

Each item is a podcast episode. The title and description come from the RSS feed. Audio playback requires the `audio` renderer — to get audio URLs directly, use the podcast's RSS feed with the `rss` plugin.
