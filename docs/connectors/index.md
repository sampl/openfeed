# Connectors

A connector is a module that knows how to fetch and format a specific type of source. For example, the Reddit connector understands the Reddit API and formats posts for the feed UI.

Connectors are responsible for:

- Authenticating to access private data sources
- Parsing HTML/JSON
- Formatting content into the format OpenFeed expects

Without a connector, OpenFeed will attempt to scrape (or embed) the entire URL of the page.

Connectors are matched using a `canHandle(url)` function. The first connector that claims a URL wins. OpenFeed tries specific connectors before generic fallbacks like the RSS connector.

## Installing connectors

You can install additional connectors from npm:

```bash
npm install openfeed-connector-example
```

Then register the connector in your `open-feed.yaml`:

```yaml
connectors:
  - openfeed-connector-example
```

## Configuring connectors

Some connectors accept an `options` object in your source config:

```yaml
sources:
  - name: My Source
    url: https://example.com/
    options:
      limit: 10
      includeImages: true
```

Refer to individual connector documentation for supported options.
