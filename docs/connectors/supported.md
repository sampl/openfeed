# Supported connectors

The following connectors ship as part of OpenFeed and do not need to be installed:

- [`al-jazeera`](#al-jazeera)
- [`associated-press`](#associated-press)
- [`bluesky`](#bluesky)
- [`buttondown`](#buttondown)
- [`centcom`](#centcom)
- [`cnn`](#cnn)
- [`dev-to`](#dev-to)
- [`espn`](#espn)
- [`github`](#github)
- [`gmail`](#gmail)
- [`google-calendar`](#google-calendar)
- [`hacker-news`](#hacker-news)
- [`instagram`](#instagram)
- [`medium`](#medium)
- [`new-yorker`](#new-yorker)
- [`nyt-crossword`](#nyt-crossword)
- [`open-meteo`](#open-meteo)
- [`podcasts`](#podcasts)
- [`politico`](#politico)
- [`reddit`](#reddit)
- [`reuters`](#reuters)
- [`rss`](#rss)
- [`substack`](#substack)
- [`tiktok`](#tiktok)
- [`wall-street-journal`](#wall-street-journal)
- [`washington-post`](#washington-post)
- [`wordle`](#wordle)
- [`youtube`](#youtube)

If no connector matches a URL, OpenFeed falls back to the `default` connector which skips the source with a warning.

---

## al-jazeera

Fetches articles from [Al Jazeera](https://aljazeera.com).

**Example URL:** `https://www.aljazeera.com`

No options.

## associated-press

Fetches articles from [AP News](https://apnews.com).

**Example URL:** `https://apnews.com`

No options.

## bluesky

Fetches posts from a [Bluesky](https://bsky.app) profile URL.

**Example URL:** `https://bsky.app/profile/example.bsky.social`

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `10` | Number of posts to fetch |

## buttondown

Fetches newsletters from a [Buttondown](https://buttondown.com) newsletter URL.

**Example URL:** `https://buttondown.com/examplenewsletter/archive`

No options.

## centcom

Fetches press releases from [CENTCOM](https://centcom.mil).

**Example URL:** `https://www.centcom.mil`

No options.

## cnn

Fetches articles from [CNN](https://cnn.com).

**Example URL:** `https://www.cnn.com`

No options.

## dev-to

Fetches articles from [dev.to](https://dev.to).

**Example URL:** `https://dev.to` (or `https://dev.to/@username` for a specific author)

No options.

## espn

Fetches articles from [ESPN](https://espn.com).

**Example URL:** `https://www.espn.com`

No options.

## github

Fetches open issues and activity from a [GitHub](https://github.com) repo or user URL.

**Example URL:** `https://github.com/example-org/example-repo`

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `10` | Max number of open issues to fetch per run |

## gmail

Fetches emails from [Gmail](https://gmail.com) via OAuth. Requires a valid OAuth token.

**Example URL:** `https://mail.google.com`

No options.

## google-calendar

Fetches events from a public [Google Calendar](https://calendar.google.com) feed.

**Example URL:** `https://calendar.google.com/calendar`

| Option | Type | Default | Description |
|---|---|---|---|
| `icsUrl` | string | — | Public iCal URL from Google Calendar settings (required) |
| `calendarUrl` | string | source URL | URL to use for items that don't have their own event URL |

## hacker-news

Fetches top stories from [Hacker News](https://news.ycombinator.com).

**Example URL:** `https://news.ycombinator.com`

No options.

## instagram

Fetches posts from an [Instagram](https://instagram.com) profile URL via the [Firecrawl](https://firecrawl.dev) API. Requires the `FIRECRAWL_API_KEY` environment variable to be set.

**Example URL:** `https://www.instagram.com/examplemuseum/`

No options.

## medium

Fetches posts from a [Medium](https://medium.com) publication URL via RSS.

**Example URL:** `https://medium.com/@exampleauthor`

No options.

## new-yorker

Fetches articles from [The New Yorker](https://newyorker.com).

**Example URL:** `https://www.newyorker.com`

No options.

## nyt-crossword

Fetches daily puzzles from the [NYT Crossword](https://nytimes.com/crosswords). Requires an NYT API key.

**Example URL:** `https://www.nytimes.com/crosswords`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | string | — | NYT API key from [developer.nytimes.com](https://developer.nytimes.com) (required) |
| `limit` | number | `7` | Number of recent puzzles to fetch |

## open-meteo

Fetches weather forecasts from the [Open-Meteo](https://open-meteo.com) weather API.

**Example URL:** `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,wind_speed_10m,weather_code`

Options are passed as query parameters to the API URL. Common options include:

| Option | Type | Default | Description |
|---|---|---|---|
| `temperature_unit` | string | `"celsius"` | Temperature unit (`"celsius"` or `"fahrenheit"`) |
| `wind_speed_unit` | string | `"kmh"` | Wind speed unit (`"kmh"`, `"mph"`, `"kn"`) |
| `precipitation_unit` | string | `"mm"` | Precipitation unit (`"mm"` or `"inch"`) |

## podcasts

Fetches episodes from a podcast RSS feed URL, resolving feed details via the iTunes lookup API.

**Example URL:** `https://podcasts.apple.com/us/podcast/my-show/id123456789`

No options.

## politico

Fetches articles from [Politico](https://politico.com).

**Example URL:** `https://www.politico.com`

No options.

## reddit

Fetches posts from a [Reddit](https://reddit.com) subreddit or thread URL.

**Example URL:** `https://www.reddit.com/r/programming/`

| Option | Type | Default | Description |
|---|---|---|---|
| `sort` | string | `"top"` | Sort order for posts (`"top"`, `"new"`, `"hot"`) |
| `time` | string | `"week"` | Time period for sorting (`"day"`, `"week"`, `"month"`, `"year"`, `"all"`) |
| `limit` | number | `5` | Number of posts to fetch |

## reuters

Fetches articles from [Reuters](https://reuters.com).

**Example URL:** `https://www.reuters.com`

No options.

## rss

Fetches items from any [RSS or Atom](https://en.wikipedia.org/wiki/RSS) feed URL.

**Example URL:** `https://feeds.kottke.org/main`

No options.

## substack

Fetches posts from a [Substack](https://substack.com) publication URL via RSS.

**Example URL:** `https://examplenewsletter.substack.com`

No options.

## tiktok

TikTok profile URLs are not supported due to the lack of a public API; this connector throws an error when used.

**Example URL:** `https://www.tiktok.com/@exampleuser`

No options.

## wall-street-journal

Fetches articles from [The Wall Street Journal](https://wsj.com).

**Example URL:** `https://www.wsj.com`

No options.

## washington-post

Fetches articles from [The Washington Post](https://washingtonpost.com).

**Example URL:** `https://www.washingtonpost.com`

No options.

## wordle

Fetches the daily [Wordle](https://nytimes.com/games/wordle) puzzle.

**Example URL:** `https://www.nytimes.com/games/wordle/index.html`

No options.

## youtube

Fetches videos from a [YouTube](https://youtube.com) channel or a specific video URL via the public RSS feed.

**Example URL:** `https://www.youtube.com/@examplechannel`

No options.
