# Plugins

A plugin is a module that knows how to fetch and format a specific type of source. For example, the Reddit plugin understands the Reddit API and formats posts for the feed UI.

Plugins are responsible for:

- Authenticating to access private data sources
- Parsing HTML/JSON
- Formatting content into the format OpenFeed expects

Without a plugin, OpenFeed will attempt to scrape (or embed) the entire URL of the page.

Plugins are matched using a `canHandle(url)` function. The first plugin that claims a URL wins. OpenFeed tries specific plugins before generic fallbacks like the RSS plugin.

## Installing plugins

You can install additional plugins from npm:

```bash
npm install open-feed-plugin-example
```

Then register the plugin in your `open-feed.yaml`:

```yaml
plugins:
  - open-feed-plugin-example
```

## Configuring plugins

Some plugins accept an `options` object in your source config:

```yaml
sources:
  - name: My Source
    url: https://example.com/
    options:
      limit: 10
      includeImages: true
```

Refer to individual plugin documentation for supported options.
