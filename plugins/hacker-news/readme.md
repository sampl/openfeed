# hacker-news plugin

Fetches front page stories from Hacker News via the Algolia HN Search API.

## Supported URL

`https://news.ycombinator.com`

## Options

- `limit` (number, default `10`) — number of stories to fetch

## Render output

Each item uses `richText` with the story title as plain text. Items without an external URL (e.g. Ask HN posts) link to the HN discussion page.
