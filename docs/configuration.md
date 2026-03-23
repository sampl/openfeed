# Configuration

All configuration lives in an `open-feed.yaml` file in the directory where you run the server.

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
        fetchMode: replace
```

### Fetch mode

| Value | Behavior |
|---|---|
| `append` (default) | Only new items are added; previous items stay in the queue |
| `replace` | Previous items from this source are deleted on each fetch; only the latest is kept |

Use `replace` for sources that represent current state, like weather or daily digests.

### Source options

| Option | Type | Description |
|---|---|---|
| `name` | string | Display name for this source |
| `url` | string | Source URL |
| `fetchMode` | `append` \| `replace` | Default: `append` |
| `plugin` | string | Force a specific connector (optional) |
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
| `"0 11 * * *"` | Daily at 6am Eastern (UTC-5) |
| `"0 14 * * 0"` | Every Sunday at 9am Eastern |
| `"0 22 * * 1-5"` | Every weekday at 5pm Eastern |
| `"0 * * * *"` | Every hour |

## Auth

Some sources require API keys. Add them as environment variables in a `.env` file alongside `open-feed.yaml`:

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

