# NYT Crossword plugin

Fetches daily NYT Crossword puzzles using the NYT API.

## Getting an API key

Register at [developer.nytimes.com](https://developer.nytimes.com) and create an app with access to the **Games API**. Your API key will be shown in the app dashboard.

## Options

- `apiKey` (required) — your NYT API key
- `limit` (optional, default `7`) — number of recent puzzles to fetch

## Configuration example

```yaml
- name: NYT Crossword
  url: https://www.nytimes.com/crosswords
  options:
    apiKey: your_api_key_here
    limit: 7
```

## Output

Each item links directly to the puzzle page. The title is either the puzzle's own title or `NYT Crossword - YYYY-MM-DD` when no title is set.
