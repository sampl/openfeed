# Supported plugins

The following plugins ship as part of OpenFeed and do not need to be installed:

- [`youtube`](#youtube)
- [`reddit`](#reddit)
- [`substack`](#substack)
- [`buttondown`](#buttondown)
- [`bluesky`](#bluesky)
- [`hacker-news`](#hacker-news)
- [`dev-to`](#dev-to)
- [`medium`](#medium)
- [`rss`](#rss)
- [`podcasts`](#podcasts)
- [`open-meteo`](#open-meteo)
- [`github`](#github)
- [`cnn`](#cnn)
- [`washington-post`](#washington-post)
- [`wall-street-journal`](#wall-street-journal)
- [`politico`](#politico)
- [`associated-press`](#associated-press)
- [`reuters`](#reuters)
- [`al-jazeera`](#al-jazeera)
- [`new-yorker`](#new-yorker)
- [`espn`](#espn)
- [`centcom`](#centcom)
- [`nyt-crossword`](#nyt-crossword)
- [`wordle`](#wordle)
- [`tiktok`](#tiktok)
- [`instagram`](#instagram)
- [`google-calendar`](#google-calendar)
- [`gmail`](#gmail)

If no plugin matches a URL, OpenFeed falls back to the `default` plugin which skips the source with a warning.

---

## youtube

Fetches videos from a [YouTube](https://youtube.com) channel or a specific video URL via the public RSS feed.

No options.

## reddit

Fetches posts from a [Reddit](https://reddit.com) subreddit or thread URL.

| Option | Type | Default | Description |
|---|---|---|---|
| `sort` | string | `"top"` | Sort order for posts (`"top"`, `"new"`, `"hot"`) |
| `time` | string | `"week"` | Time period for sorting (`"day"`, `"week"`, `"month"`, `"year"`, `"all"`) |
| `limit` | number | `5` | Number of posts to fetch |

## substack

Fetches posts from a [Substack](https://substack.com) publication URL via RSS.

No options.

## buttondown

Fetches newsletters from a [Buttondown](https://buttondown.com) newsletter URL.

No options.

## bluesky

Fetches posts from a [Bluesky](https://bsky.app) profile URL.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `10` | Number of posts to fetch |

## hacker-news

Fetches top stories from [Hacker News](https://news.ycombinator.com).

No options.

## dev-to

Fetches articles from [dev.to](https://dev.to).

No options.

## medium

Fetches posts from a [Medium](https://medium.com) publication URL via RSS.

No options.

## rss

Fetches items from any [RSS or Atom](https://en.wikipedia.org/wiki/RSS) feed URL.

No options.

## podcasts

Fetches episodes from a podcast RSS feed URL, resolving feed details via the iTunes lookup API.

No options.

## open-meteo

Fetches weather forecasts from the [Open-Meteo](https://open-meteo.com) weather API.

Options are passed as query parameters to the API URL. Common options include:

| Option | Type | Default | Description |
|---|---|---|---|
| `temperature_unit` | string | `"celsius"` | Temperature unit (`"celsius"` or `"fahrenheit"`) |
| `wind_speed_unit` | string | `"kmh"` | Wind speed unit (`"kmh"`, `"mph"`, `"kn"`) |
| `precipitation_unit` | string | `"mm"` | Precipitation unit (`"mm"` or `"inch"`) |

## github

Fetches open issues and activity from a [GitHub](https://github.com) repo or user URL.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `10` | Max number of open issues to fetch per run |

## cnn

Fetches articles from [CNN](https://cnn.com).

No options.

## washington-post

Fetches articles from [The Washington Post](https://washingtonpost.com).

No options.

## wall-street-journal

Fetches articles from [The Wall Street Journal](https://wsj.com).

No options.

## politico

Fetches articles from [Politico](https://politico.com).

No options.

## associated-press

Fetches articles from [AP News](https://apnews.com).

No options.

## reuters

Fetches articles from [Reuters](https://reuters.com).

No options.

## al-jazeera

Fetches articles from [Al Jazeera](https://aljazeera.com).

No options.

## new-yorker

Fetches articles from [The New Yorker](https://newyorker.com).

No options.

## espn

Fetches articles from [ESPN](https://espn.com).

No options.

## centcom

Fetches press releases from [CENTCOM](https://centcom.mil).

No options.

## nyt-crossword

Fetches daily puzzles from the [NYT Crossword](https://nytimes.com/crosswords). Requires an NYT API key.

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | string | — | NYT API key from [developer.nytimes.com](https://developer.nytimes.com) (required) |
| `limit` | number | `7` | Number of recent puzzles to fetch |

## wordle

Fetches the daily [Wordle](https://nytimes.com/games/wordle) puzzle.

No options.

## tiktok

TikTok profile URLs are not supported due to the lack of a public API; this plugin throws an error when used.

No options.

## instagram

Fetches posts from an [Instagram](https://instagram.com) profile URL via the [Firecrawl](https://firecrawl.dev) API. Requires the `FIRECRAWL_API_KEY` environment variable to be set.

No options.

## google-calendar

Fetches events from a public [Google Calendar](https://calendar.google.com) feed.

| Option | Type | Default | Description |
|---|---|---|---|
| `icsUrl` | string | — | Public iCal URL from Google Calendar settings (required) |
| `calendarUrl` | string | source URL | URL to use for items that don't have their own event URL |

## gmail

Fetches emails from [Gmail](https://gmail.com) via OAuth. Requires a valid OAuth token.

No options.
