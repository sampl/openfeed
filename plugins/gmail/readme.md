# Gmail plugin

This plugin is a stub for future Gmail integration. Full OAuth 2.0 support is not yet implemented.

## Why OAuth is required

Gmail does not offer a public RSS or API endpoint accessible without authentication. Fetching mail requires OAuth 2.0 with the Gmail API.

## Setup steps (for future implementation)

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Enable the **Gmail API** under APIs & Services
3. Create **OAuth 2.0 credentials** (choose Desktop app as the application type)
4. Run an OAuth consent flow to obtain a refresh token for your account
5. Use the refresh token to get access tokens for API requests

## Alternative: Gmail RSS/Atom feed

Gmail provides a built-in Atom feed for unread mail at:

```
https://mail.google.com/mail/feed/atom
```

This feed is only accessible when the user is logged into Gmail in the same browser session. It is not suitable for server-side use.
