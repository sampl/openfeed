import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
import { FeedError } from "../types.js";

interface CalendarEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  description: string;
  url: string;
}

const extractIcsProperty = (block: string, property: string): string => {
  const regex = new RegExp(`^${property}(?:;[^:]*)?:(.*)$`, "mi");
  const match = regex.exec(block);
  return match?.[1]?.trim() ?? "";
};

const parseIcsDate = (value: string): Date => {
  const datePart = value.includes(":") ? value.split(":").pop()! : value;

  if (datePart.includes("T")) {
    const normalized = datePart.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/,
      "$1-$2-$3T$4:$5:$6$7"
    );
    return new Date(normalized);
  }

  const normalized = datePart.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  return new Date(normalized);
};

const parseVEvents = (icsText: string): CalendarEvent[] => {
  const blocks = icsText.split("BEGIN:VEVENT");
  return blocks.slice(1).map((block) => {
    const endIndex = block.indexOf("END:VEVENT");
    const eventBlock = endIndex !== -1 ? block.slice(0, endIndex) : block;

    return {
      summary: extractIcsProperty(eventBlock, "SUMMARY"),
      dtstart: extractIcsProperty(eventBlock, "DTSTART"),
      dtend: extractIcsProperty(eventBlock, "DTEND"),
      description: extractIcsProperty(eventBlock, "DESCRIPTION"),
      url: extractIcsProperty(eventBlock, "URL"),
    };
  });
};

const googleCalendarPlugin: BackendFeedPlugin = {
  name: "google-calendar",

  canHandle: (sourceUrl) => sourceUrl.includes("calendar.google.com"),

  listItems: async (sourceUrl, fetchFn, _context, options): Promise<readonly PluginAS2Object[]> => {
    const icsUrl = options?.icsUrl;
    if (typeof icsUrl !== "string" || !icsUrl) {
      throw new FeedError(
        "Google Calendar requires a public ICS URL. See readme for setup.",
        "invalid_config"
      );
    }

    const response = await fetchFn(icsUrl);
    if (!response.ok) {
      const code = response.status === 404 ? "source_not_found"
        : (response.status === 401 || response.status === 403) ? "auth_error"
        : response.status === 429 ? "rate_limited"
        : "network_error";
      throw new FeedError(`Failed to fetch ICS feed: HTTP ${response.status}`, code);
    }

    const icsText = await response.text();
    const events = parseVEvents(icsText);

    const calendarUrl =
      typeof options?.calendarUrl === "string" ? options.calendarUrl : sourceUrl;

    return events.map((event): PluginAS2Object => ({
      type: "Event",
      name: event.summary || "Untitled event",
      summary: event.description || undefined,
      url: event.url || calendarUrl,
      published: parseIcsDate(event.dtstart),
    }));
  },
};

export default googleCalendarPlugin;
