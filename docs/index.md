# Welcome to OpenFeed!

OpenFeed is a self-hosted news and social media aggregator.

Things you can do with OpenFeed:

- See events from local businesses on your phone
- Get the top [HackerNews](https://news.ycombinator.com) stories every Saturday
- Print the [NYT crossword](https://www.nytimes.com/crosswords) every day at 8am
- Watch a stream of all videos posted to [kottke.org](https://kottke.org)
- See a list of all [YouTube](https://www.youtube.com) videos only from channels you subscribe to
- Get a text with the weather forecast every day at 6am

## Quick start

1. Install: `npm install -g open-feed`
2. Add an `open-feed.yaml` config file (see [configuration](/configuration))
3. Run: `open-feed`
4. Visit your server at `http://localhost:3000`

See [full installation instructions](/installation).

## How it works

Install OpenFeed and configure it with an `open-feed.yaml` file listing your sources and a schedule.

OpenFeed runs as a server that periodically fetches content from each source and compiles it into a feed. Browse your feed from any device by visiting your personal server's URL.

### Server

The OpenFeed server is an open-source Node.js server that you run on your own hardware. The server intermittently queries various content sources on your behalf, filters content according to your preferences, and compiles the posts into a custom feed.

The OpenFeed server uses [connectors](/connectors/) to download and format content from various sources. You can configure your OpenFeed server with various sources and feeds with an [`open-feed.yaml` file](/configuration).

### Clients

An OpenFeed client is any application that queries from an OpenFeed server instance and displays posts to the user. OpenFeed clients use the [OpenFeed API](/api) to communicate with an OpenFeed server.

OpenFeed comes with one official client, bundled with the server when you install.

- Web - React-based; supports PWAs, mobile web, and desktop.

Ideas for OpenFeed clients:
- Native mobile - native iOS and Android apps for browsing your OpenFeed
- Print - automatically print the news each day
- CLI - browse your feed from the terminal
- GoogleTV
- SMS - Get breaking news by text

You can create your own clients by hitting the OpenFeed API. If you do, [let me know](https://directedworks.com) so I can add it here!
