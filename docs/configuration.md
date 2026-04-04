# Configuration

All configuration lives in an `openfeed.yaml` file in the directory where you run the server.

## Examples

See working examples in the GitHub repo:

- [Basic example](https://github.com/sampl/openfeed/blob/main/examples/basic.yaml)
- [Kitchen sink](https://github.com/sampl/openfeed/blob/main/examples/kitchen-sink.yaml)

## Sources

Sources are the core of OpenFeed — everything you want to follow. Each source has a URL and an optional name.

```yaml
feeds:
  - name: Main
    sources:
      - name: New York Times
        url: https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml

      - name: Hacker News
        url: https://hnrss.org/frontpage

      - name: My Favorite YouTuber
        url: https://www.youtube.com/@channelhandle

      - name: Interesting Newsletter
        url: https://authorname.substack.com

      - name: Today I Learned
        url: https://www.reddit.com/r/todayilearned/

      - name: My City Weather
        url: https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true
        maxItems: 1
        expirationDays: 1
```

### Source options

| Option | Type | Description |
|---|---|---|
| `name` | string | Display name for this source |
| `url` | string | Source URL |
| `connector` | string | Force a specific connector by name (optional) |
| `maxItems` | number | Max items to keep from this source |
| `maxAgeDays` | number | Ignore items older than N days |
| `expirationDays` | number | Auto-archive items after N days |

## Schedule

The `schedule` field uses standard cron syntax: `minute hour day-of-month month day-of-week`. All times are UTC.

```yaml
schedule: "0 7 * * *"  # 7am UTC daily (default)
```

Common examples:

| Cron | Description |
|---|---|
| `"0 11 * * *"` | Daily at 11am UTC (6am EST / 7am EDT) |
| `"0 14 * * 0"` | Every Sunday at 2pm UTC (9am EST / 10am EDT) |
| `"0 22 * * 1-5"` | Every weekday at 10pm UTC (5pm EST / 6pm EDT) |
| `"0 * * * *"` | Every hour |

## Auth

Some sources require API keys. Add them as environment variables in a `.env` file alongside `openfeed.yaml`:

```bash
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

| Variable | Required for |
|---|---|
| `FIRECRAWL_API_KEY` | Instagram sources |

### Adding environment variables on hosted platforms

- **Railway** — Settings → Variables
- **Fly.io** — `fly secrets set KEY=value`
- **DigitalOcean** — App spec → Environment variables
- **VPS** — Add to your systemd service with `Environment=KEY=value` or use a `.env` file

## Feeds

A feed is a named group of sources with its own schedule and time limits. Use multiple feeds to organize your content into sections.

```yaml
feeds:
  - name: Morning
    schedule: "0 7 * * *"
    timeLimit:
      daily: 30    # minutes
    sources:
      - name: New York Times
        url: https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml
      - name: Hacker News
        url: https://hnrss.org/frontpage

  - name: Evening
    schedule: "0 17 * * *"
    sources:
      - name: ESPN
        url: https://www.espn.com/

  - name: Weekend
    schedule: "0 9 * * 6,0"
    sources:
      - name: The New Yorker
        url: https://www.newyorker.com/
```

Each feed supports its own `schedule`, `sources`, and `timeLimit`. Source-level options override feed-level options.

## Time limits

Optionally cap reading time per feed per day or week:

```yaml
feeds:
  - name: Main
    timeLimit:
      daily: 30    # minutes
      weekly: 180  # minutes
    sources: ...
```

When the daily limit is reached, the feed is blocked until the next day.

## External connectors

You can extend OpenFeed with custom connectors without modifying the server source code. Connectors can be loaded from npm packages or from local files on the server.

### Loading from npm

Install the package on your server and list it under `connectors` in your config:

```yaml
connectors:
  - openfeed-connector-mastodon
  - openfeed-connector-bluesky-lists
```

Then force a source to use it with the `connector` field:

```yaml
feeds:
  - name: Social
    sources:
      - name: My Mastodon
        url: https://mastodon.social/@me
        connector: mastodon
```

### Loading local files

Point to a local JS file (relative to the config file) or a directory of connectors:

```yaml
# Load specific files
connectors:
  - ./my-connectors/internal-blog.js
  - ./my-connectors/company-calendar.js

# Or auto-scan a directory for all connector modules
connectorsDir: ./my-connectors
```

The `connectorsDir` directory is scanned for:
- `*.js` and `*.mjs` files directly in the directory
- `*/index.js` files in subdirectories

### Writing connectors

See [Writing a connector](./connectors/custom.md) for how to implement the `BackendFeedPlugin` interface.
