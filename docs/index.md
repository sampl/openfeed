# Welcome to OpenFeed!

OpenFeed is a self-hosted news and social media aggregator.

- Define your sources in a config file
- OpenFeed fetches content on a daily schedule
- Browse your feed in a mobile-first web UI from any device

## Things you can do with OpenFeed

- See events from local businesses on your phone
- Get the top [HackerNews](https://news.ycombinator.com) stories every Saturday
- Print the [NYT crossword](https://www.nytimes.com/crosswords) every day at 8am
- Watch a stream of all videos posted to [kottke.org](https://kottke.org)
- See a list of all [YouTube](https://www.youtube.com) videos only from channels you subscribe to
- Get a text with the weather forecast every day at 6am

## Server

The OpenFeed server is an open-source nodeJS server that you run on your own hardware. The server intermittently queries various content sources on your behalf, filters content according to your preferences, and compiles the posts into a custom feed.

The OpenFeed server uses [connectors](/plugins/) to download and format content from various sources. You can configure your open feed server with various sources and feeds with an [`open-feed.yaml` file](/configuration).

## Clients

An open feed client is any application that queries from an openfeed server instance and displays posts to the user. Openfeed clients use the [openfeed API](/api) to communicate with an openfeed server.

OpenFeed comes with one official client, bundled with the server when you install.

- Web - React-based; supports PWAs, mobile web, and desktop.

Ideas for openfeed clients:
- Native mobile - native iOS and Android devices for browsing your open-feed
- Print - automatically print the news each day
- CLI - browse your feed from the terminal
- GoogleTV
- SMS - Get breaking news by text

You can create your own clients by hitting the OpenFeed API. If you do, [let me know](https://directedworks.com) so I can add it here!

## Quick start

1. Create a directory for your project
2. Add an `open-feed.yaml` with your sources (see [configuration](/configuration))
3. Install:

```bash
npm install -g open-feed
```

4. Run:

```bash
open-feed
```

5. Open `http://localhost:3000`

See [full installation instructions](/installation).
