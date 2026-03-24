# youtube plugin

Fetches the latest videos from a YouTube channel via its Atom RSS feed.

## Supported URLs

Any URL containing `youtube.com`. Two formats are supported:

- **Handle URLs:** `https://www.youtube.com/@channelhandle` — the plugin scrapes the channel page to resolve the channel ID, then fetches the RSS feed.
- **Channel ID URLs:** `https://www.youtube.com/channel/CHANNEL_ID` — the channel ID is extracted directly from the URL path.

Mobile YouTube URLs (e.g. `https://m.youtube.com/@handle`) are also supported.

## Example config

```yaml
- name: Channel Name
  url: https://www.youtube.com/@channelhandle
```

## Render output

Each video produces an item with:

- `video` render method — embeds the video via `<iframe>` using the YouTube video ID
- `richText` fallback — shows the video description or title as plain text
