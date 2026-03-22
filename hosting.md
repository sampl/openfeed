# Self-hosting open-feed

This guide covers everything you need to install, configure, and run open-feed on your own machine or a server.

## Prerequisites

- Node.js 18 or later (`node --version`)
- npm or pnpm

## Installation

```bash
npm install -g open-feed
```

Or run without installing (once published to npm):
```bash
npx open-feed
```

## Configuration

Create a `open-feed.yaml` file in the directory where you'll run the server. This is the only config file you need.

```yaml
# Port to serve the web UI on
port: 3000

# Cron expression for the daily fetch (7am UTC by default)
schedule: "0 7 * * *"

sources:
  # YouTube channels — use the @handle URL
  - name: My Favorite YouTuber
    url: https://www.youtube.com/@channelhandle

  # Substack blogs — use the publication URL
  - name: Interesting Newsletter
    url: https://authorname.substack.com

  # Any RSS/Atom feed — use the feed URL directly
  - name: My Blog
    url: https://example.com/feed.xml

  # Instagram — requires FIRECRAWL_API_KEY (see below)
  - name: My Favorite Account
    url: https://www.instagram.com/username/

  # Weather — use replace mode so only today's weather stays in the queue
  - name: My City Weather
    url: https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true
    fetchMode: replace
```

### `fetchMode` options

| Value | Behavior |
|---|---|
| `append` (default) | Only new items are added; old items stay in the queue |
| `replace` | Previous items from this source are deleted; only the latest item is kept |

Use `replace` for sources that represent current state (weather, daily digests).

### Cron schedule syntax

The `schedule` field uses standard cron syntax: `minute hour day month weekday`.

- `"0 7 * * *"` — 7:00 AM UTC every day
- `"0 8 * * 1-5"` — 8:00 AM UTC on weekdays only
- `"0 */6 * * *"` — Every 6 hours

All times are in UTC.

## API keys

Create a `.env` file in the same directory as `open-feed.yaml`:

```bash
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

Instagram sources require a Firecrawl API key. Without it, Instagram sources are skipped with a warning. All other source types work without any API keys.

## Running the server

```bash
open-feed
```

The server starts on the port defined in `open-feed.yaml` (default: 3000). Open your browser to `http://localhost:3000`.

### CLI options

```bash
open-feed --port 8080              # override the port
open-feed --config /path/to/config.yaml  # use a different config file
open-feed --db /path/to/data.db    # use a different database file
open-feed fetch                    # run a manual fetch and exit
```

## Accessing from your phone

### Same network (local)

Find your computer's local IP address:
- macOS: System Settings → Wi-Fi → Details, or `ipconfig getifaddr en0`
- Linux: `ip addr show` or `hostname -I`

Then open `http://192.168.x.x:3000` on your phone (replace with your actual IP).

### Over the internet

For permanent remote access, deploy to a server (see below). For quick testing:

```bash
# Using ngrok (free tier available)
ngrok http 3000
```

ngrok gives you a public HTTPS URL that tunnels to your local server.

## Deployment

### Railway (recommended — easiest)

1. Push your project to a GitHub repository (include `open-feed.yaml` but **not** `.env`)
2. Create a new project at [railway.app](https://railway.app)
3. Connect your GitHub repo
4. Set environment variables in Railway's dashboard (Settings → Variables):
   - `FIRECRAWL_API_KEY` if needed
5. Set the start command: `open-feed`
6. Railway auto-deploys on every push to your main branch

The `open-feed.db` SQLite file will be created in the project directory. Note: Railway's filesystem is ephemeral — use a persistent volume or export your DB periodically if you want to preserve your read history across redeploys.

### Fly.io

1. Install the Fly CLI: `brew install flyctl` / `curl -L https://fly.io/install.sh | sh`
2. Create a `Dockerfile` in your project:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g open-feed
COPY open-feed.yaml .
EXPOSE 3000
CMD ["open-feed"]
```

3. Deploy:
```bash
fly launch
fly secrets set FIRECRAWL_API_KEY=your_key_here
fly deploy
```

4. Create a persistent volume for the SQLite database:
```bash
fly volumes create news_feed_data --size 1
```

Then update your `Dockerfile` CMD to: `open-feed --db /data/open-feed.db` and mount the volume at `/data`.

### DigitalOcean App Platform

1. Push to GitHub
2. Create a new App at [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
3. Connect your repo, set the run command to `open-feed`
4. Add environment variables in the App spec
5. Deploy

### VPS / self-managed server

On Ubuntu/Debian:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install open-feed globally
npm install -g open-feed

# Create config
mkdir ~/open-feed && cd ~/open-feed
cat > open-feed.yaml << 'EOF'
port: 3000
schedule: "0 7 * * *"
sources:
  - name: Example
    url: https://example.substack.com
EOF

# Create a systemd service
sudo tee /etc/systemd/system/open-feed.service << 'EOF'
[Unit]
Description=open-feed personal RSS reader
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/open-feed
ExecStart=/usr/bin/open-feed
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable open-feed
sudo systemctl start open-feed
sudo systemctl status open-feed
```

### GitHub Actions auto-deploy

To automatically deploy when you push changes to `open-feed/`:

```yaml
# .github/workflows/deploy-open-feed.yml
name: Deploy open-feed

on:
  push:
    paths:
      - 'open-feed/**'
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: open-feed
```

## Accessing from your phone (hosted)

Once deployed, open the server URL in your phone's browser. For a PWA-like experience on iOS:

1. Navigate to your open-feed URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

The app is mobile-first and works well as a home screen web app.

## Troubleshooting

**Server starts but no items appear**
Run a manual fetch: `curl -X POST http://localhost:3000/api/fetch`
Or visit the Runs page in the UI to see fetch history and any errors.

**YouTube sources return no items**
YouTube @handle URLs require the handle to exist. Verify the handle is correct by visiting the URL in a browser.

**Instagram sources are skipped**
Set `FIRECRAWL_API_KEY` in your `.env` file. The key is available at [firecrawl.dev](https://firecrawl.dev).

**Port already in use**
Change the `port` in `open-feed.yaml` or pass `--port 3001`.

**Database file grows large**
The `open-feed.db` file grows as items accumulate. Archived items are kept for the archive view but are not automatically deleted. To reset: stop the server, delete `open-feed.db`, and restart.
