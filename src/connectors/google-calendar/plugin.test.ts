import { describe, it, expect, vi } from "vitest";
import googleCalendarPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Team standup
DTSTART:20240115T090000Z
DTEND:20240115T093000Z
DESCRIPTION:Daily team sync
URL:https://meet.google.com/abc-defg-hij
END:VEVENT
BEGIN:VEVENT
SUMMARY:All hands
DTSTART:20240116
DTEND:20240117
DESCRIPTION:
URL:
END:VEVENT
END:VCALENDAR`;

describe("google-calendar canHandle", () => {
  it("returns true for calendar.google.com URLs", () => {
    expect(
      googleCalendarPlugin.canHandle("https://calendar.google.com/calendar")
    ).toBe(true);
  });

  it("returns false for non-Google Calendar URLs", () => {
    expect(googleCalendarPlugin.canHandle("https://gmail.com")).toBe(false);
  });
});

describe("google-calendar listItems", () => {
  it("throws a FeedError with invalid_config when no icsUrl in options", async () => {
    const fetchFn = vi.fn();
    const error = await googleCalendarPlugin.listItems(
      "https://calendar.google.com/calendar",
      fetchFn
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("invalid_config");
    expect((error as FeedError).message).toContain("ICS URL");
  });

  it("throws a FeedError with source_not_found on 404 response from ICS URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response);
    const error = await googleCalendarPlugin.listItems(
      "https://calendar.google.com/calendar",
      fetchFn,
      { icsUrl: "https://calendar.google.com/ical/test.ics" }
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
  });

  it("throws a FeedError with auth_error on 401 response from ICS URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 } as unknown as Response);
    const error = await googleCalendarPlugin.listItems(
      "https://calendar.google.com/calendar",
      fetchFn,
      { icsUrl: "https://calendar.google.com/ical/private.ics" }
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("auth_error");
  });

  it("returns calendar events from mocked ICS response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => SAMPLE_ICS,
    } as unknown as Response);

    const items = await googleCalendarPlugin.listItems(
      "https://calendar.google.com/calendar",
      fetchFn,
      { icsUrl: "https://calendar.google.com/calendar/ical/test/public/basic.ics" }
    );

    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.title).toBe("Team standup");
    expect(first.url).toBe("https://meet.google.com/abc-defg-hij");
    expect(first.renderData).toMatchObject({
      richText: { text: expect.stringContaining("Team standup") },
    });

    const second = items[1]!;
    expect(second.title).toBe("All hands");
    // No URL in event — falls back to sourceUrl
    expect(second.url).toBe("https://calendar.google.com/calendar");
  });
});
