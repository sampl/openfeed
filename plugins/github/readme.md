# GitHub plugin

Fetches new open issues from a public GitHub repository using the GitHub REST API.

## URL format

```
https://github.com/{owner}/{repo}
```

Example: `https://github.com/dnd-kit/dnd-kit`

## Options

- `limit` (number, default: `10`) — max number of issues to fetch per run

## Notes

- Unauthenticated requests are limited to 60 per hour per IP, which is sufficient for a daily cron.
- Only open issues are fetched, sorted by creation date (newest first).
- Pull requests are excluded by the GitHub API automatically when using the issues endpoint.
