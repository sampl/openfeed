# API

The OpenFeed server exposes a REST API that the web UI uses to serve your content. You can also use it to build your own front end, integrations, or automations.

The base URL is the address of your OpenFeed server, e.g. `http://localhost:3000`.

## Version

### Get server version

```
GET /api/version
```

Returns the running application version and database schema version. Always public — no authentication required.

**Response:**

```json
{
  "version": "0.1.0",
  "dbVersion": 4
}
```

| Field       | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `version`   | The application version, matching the `version` field in `package.json` |
| `dbVersion` | The highest database migration number that has been applied             |

## Items

### Get items

```
GET /api/items
```

Returns a paginated list of feed items.

**Query parameters:**

| Parameter | Type                                   | Description                    |
| --------- | -------------------------------------- | ------------------------------ |
| `status`  | `unread` \| `archived` \| `read-later` | Filter by status               |
| `feed`    | string                                 | Filter by feed name            |
| `limit`   | number                                 | Items per page (default: 30)   |
| `offset`  | number                                 | Pagination offset (default: 0) |

**Response:**

```json
{
  "items": [
    {
      "id": "abc123",
      "sourceName": "Hacker News",
      "sourceUrl": "https://hnrss.org/frontpage",
      "feedName": "Main",
      "title": "Show HN: My project",
      "url": "https://news.ycombinator.com/item?id=...",
      "publishedAt": "2024-01-15T10:00:00Z",
      "status": "unread",
      "renderData": {
        "richText": { "text": "Article content..." }
      }
    }
  ],
  "total": 142
}
```

### Update item status

```
PATCH /api/items/:id
```

**Body:**

```json
{ "status": "archived" }
```

Valid status values: `unread`, `archived`, `read-later`

## Fetching

### Trigger a manual fetch

```
POST /api/fetch
```

Runs a fetch cycle immediately and returns when complete.

**Response:**

```json
{ "runId": "run_abc123" }
```

## Feeds

### List feeds

```
GET /api/feeds
```

Returns the list of configured feeds from `openfeed.yaml`.

**Response:**

```json
{
  "feeds": [{ "name": "Main" }, { "name": "Evening" }]
}
```

## Fetch history

### List runs

```
GET /api/runs
```

**Query parameters:**

| Parameter | Type   | Description                     |
| --------- | ------ | ------------------------------- |
| `limit`   | number | Results to return (default: 50) |

**Response:**

```json
{
  "runs": [
    {
      "id": "run_abc123",
      "triggeredBy": "schedule",
      "startedAt": "2024-01-15T07:00:00Z",
      "completedAt": "2024-01-15T07:00:45Z",
      "status": "success",
      "sourceResults": [
        {
          "sourceName": "Hacker News",
          "sourceUrl": "https://hnrss.org/frontpage",
          "newItemsCount": 12,
          "status": "success"
        }
      ]
    }
  ]
}
```

## Time tracking

### Get time limits

```
GET /api/time/limits
```

Returns configured time limits from `openfeed.yaml`.

**Response:**

```json
{
  "limits": {
    "Main": { "daily": 30, "weekly": 180 }
  }
}
```

### Get time usage

```
GET /api/time/usage
```

**Query parameters:**

| Parameter | Type         | Description                    |
| --------- | ------------ | ------------------------------ |
| `date`    | `YYYY-MM-DD` | Date to query (default: today) |

**Response:**

```json
{
  "usage": {
    "Main": { "dailyMs": 900000, "weeklyMs": 3600000 }
  }
}
```

### Record a session

```
POST /api/time/sessions
```

**Body:**

```json
{
  "feedName": "Main",
  "durationMs": 30000
}
```
