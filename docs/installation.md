# Installation

## Requirements

- Node.js 18 or later
- A persistent process host — see [deployment](#deployment) (not serverless)
- A writable filesystem for SQLite storage

OpenFeed is **not compatible** with serverless/edge runtimes (Cloudflare Workers, Vercel Edge, AWS Lambda). Deploy to Railway, Fly.io, DigitalOcean App Platform, or a VPS.

## Install

```bash
npm install -g open-feed
```

Create an `open-feed.yaml` config file (see [configuration](/configuration)), then start the server:

```bash
open-feed
```

Open `http://localhost:3000` to browse your feed.

## CLI options

```bash
open-feed                                # start server (default port 3000)
open-feed --port 8080                    # override port
open-feed --config /path/to/config.yaml  # custom config path
open-feed --db /path/to/data.db          # custom database path
open-feed fetch                          # run a manual fetch and exit
```

## Deployment

### Railway (recommended)

1. Push your project (with `open-feed.yaml`, without `.env`) to GitHub
2. Create a new project at [railway.app](https://railway.app) and connect your repo
3. Set environment variables in Settings → Variables (e.g. `FIRECRAWL_API_KEY`)
4. Set start command: `open-feed`

Railway auto-deploys on every push. Note: Railway's filesystem is ephemeral — use a persistent volume if you want to preserve read history across redeploys.

### Fly.io

1. Install the Fly CLI: `brew install flyctl`
2. Create a `Dockerfile` in your project directory:

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

4. For persistent SQLite storage, create a volume:

```bash
fly volumes create open_feed_data --size 1
```

Then use `open-feed --db /data/open-feed.db` and mount the volume at `/data`.

### DigitalOcean App Platform

1. Push to GitHub
2. Create a new App at [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
3. Connect your repo, set run command: `open-feed`
4. Add environment variables and deploy

### VPS (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install open-feed
npm install -g open-feed
mkdir ~/open-feed && cd ~/open-feed

# Create config (edit as needed)
cat > open-feed.yaml << 'EOF'
port: 3000
schedule: "0 7 * * *"
feeds:
  - name: Main
    sources:
      - name: Example
        url: https://example.substack.com
EOF

# Create a systemd service
sudo tee /etc/systemd/system/open-feed.service << 'EOF'
[Unit]
Description=open-feed
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
```

### Cloudflare Pages (docs only)

The OpenFeed docs site can be hosted on Cloudflare Pages. In your Cloudflare Pages project settings, configure:

- **Build command:** `pnpm --filter open-feed docs:build`
- **Build output directory:** `open-feed/docs/.vitepress/dist`
- **Root directory:** `/` (repo root, so pnpm can resolve workspaces)
- **Node.js version:** 18 or later

Cloudflare Pages will automatically rebuild and redeploy whenever you push to your connected GitHub branch.

## Version updates

```bash
npm update -g open-feed
```

The SQLite database schema is backwards-compatible across patch and minor versions.

## Accessing from your phone

Once the server is running, navigate to its URL in Safari or Chrome. To install as a PWA on iOS: tap Share → "Add to Home Screen".

For local access on the same network, find your computer's local IP (`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux) and open `http://192.168.x.x:3000`.
