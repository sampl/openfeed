# Installation

## Requirements

- Node.js 18 or later
- A persistent process host — see [deployment](#deployment) (not serverless)
- A writable filesystem for SQLite storage

OpenFeed is **not compatible** with serverless/edge runtimes (Cloudflare Workers, Vercel Edge, AWS Lambda). Deploy to Railway, Fly.io, DigitalOcean App Platform, or a VPS.

## Install

### Build from source

Clone the repository and run the setup script:

```bash
git clone https://github.com/sampl/openfeed.git
cd openfeed
bash scripts/setup.sh
```

This installs dependencies and produces a production build in `dist/`. Then create an `openfeed.yaml` config file (see [configuration](/configuration)) and start the server:

```bash
node dist/server/main.js
```

Open `http://localhost:3000` to browse your feed.

## CLI options

```bash
openfeed                                # start server (default port 3000)
openfeed --port 8080                    # override port
openfeed --config /path/to/config.yaml  # custom config path
openfeed --db /path/to/data.db          # custom database path
openfeed fetch                          # run a manual fetch and exit
```

## Deployment

### Railway (recommended)

1. Push your project (with `openfeed.yaml`, without `.env`) to GitHub
2. Create a new project at [railway.app](https://railway.app) and connect your repo
3. Set environment variables in Settings → Variables (e.g. `FIRECRAWL_API_KEY`)
4. Set start command: `openfeed`

Railway auto-deploys on every push. Note: Railway's filesystem is ephemeral — use a persistent volume if you want to preserve read history across redeploys.

### Fly.io

1. Install the Fly CLI: `brew install flyctl`
2. Create a `Dockerfile` in your project directory:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g openfeed
COPY openfeed.yaml .
EXPOSE 3000
CMD ["openfeed"]
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

Then use `openfeed --db /data/openfeed.db` and mount the volume at `/data`.

### DigitalOcean App Platform

1. Push to GitHub
2. Create a new App at [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
3. Connect your repo, set run command: `openfeed`
4. Add environment variables and deploy

### VPS (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone and build openfeed
git clone https://github.com/sampl/openfeed.git ~/openfeed
cd ~/openfeed
bash scripts/setup.sh

# Create config (edit as needed)
cat > openfeed.yaml << 'EOF'
port: 3000
schedule: "0 7 * * *"
feeds:
  - name: Main
    sources:
      - name: Example
        url: https://example.substack.com
EOF

# Create a systemd service
sudo tee /etc/systemd/system/openfeed.service << 'EOF'
[Unit]
Description=openfeed
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/openfeed
ExecStart=/usr/bin/node /home/YOUR_USERNAME/openfeed/dist/server/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable openfeed
sudo systemctl start openfeed
```

### GitHub Actions auto-deploy

To automatically redeploy when you push changes to your config:

```yaml
# .github/workflows/deploy-openfeed.yml
name: Deploy openfeed

on:
  push:
    paths:
      - 'openfeed/**'
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
          service: openfeed
```

## Version updates

From inside the cloned repo:

```bash
bash scripts/setup.sh
```

The script pulls the latest commits, reinstalls dependencies if they changed, and rebuilds. The SQLite database schema is backwards-compatible across patch and minor versions.

## Accessing from your phone

Once the server is running, navigate to its URL in Safari or Chrome. To install as a PWA on iOS: tap Share → "Add to Home Screen".

For local access on the same network, find your computer's local IP (`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux) and open `http://192.168.x.x:3000`.

