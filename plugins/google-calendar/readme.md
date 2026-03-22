# Google Calendar plugin

Fetches events from a public Google Calendar using its ICS feed.

## Getting the ICS URL

1. Open [Google Calendar](https://calendar.google.com)
2. Go to **Settings** → select your calendar → scroll to **Integrate calendar**
3. Copy the **Public address in iCal format** URL

Note: the calendar must be set to **public** for the ICS URL to work. Private calendars will return a 403 error.

## Options

- `icsUrl` (required) — the public iCal URL from your Google Calendar settings
- `calendarUrl` (optional) — URL to use for items that don't have their own event URL; defaults to the source URL

## Configuration example

```yaml
- name: My Calendar
  url: https://calendar.google.com/calendar
  options:
    icsUrl: https://calendar.google.com/calendar/ical/your_calendar_id/public/basic.ics
```

## Output

Each item represents a calendar event. The title is the event summary. If the event has a description, it is appended to the item text.
