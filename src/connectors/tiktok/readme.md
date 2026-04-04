# TikTok plugin

TikTok does not have a public API, so this plugin cannot fetch content directly from TikTok URLs.

## Workarounds

Use a third-party RSS bridge service such as [RSSHub](https://rsshub.app) to generate an RSS feed for a TikTok user:

```
https://rsshub.app/tiktok/user/@username
```

Then configure your source to use the `rss` plugin with the RSSHub URL instead of a tiktok.com URL:

```yaml
- name: My TikTok Feed
  url: https://rsshub.app/tiktok/user/@username
  connector: rss
```

This bypasses the need for a TikTok API key and works as long as the RSSHub instance is available.
