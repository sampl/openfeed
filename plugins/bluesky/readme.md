# bluesky plugin

Fetches posts from a Bluesky user profile via the public AT Protocol API.

## Supported URL format

`https://bsky.app/profile/handle.bsky.social`

The handle is extracted from the `/profile/` path segment and used to query the author feed.

## Options

- `limit` (number, default `10`) — number of posts to fetch

## Render output

Each item uses `richText` with the full post text. The title is the first line of the post, capped at 80 characters.
