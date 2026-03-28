import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";
import { makeErrorResponse } from "../__fixtures__/index.ts";

const SAMPLE_RESPONSE = {
  current: {
    temperature_2m: 8.5,
    wind_speed_10m: 12.3,
    weather_code: 3,
    time: "2024-01-15T10:00",
  },
  hourly: {
    time: ["2024-01-15T00:00", "2024-01-15T01:00"],
    temperature_2m: [7.0, 7.5],
    precipitation_probability: [0, 5],
  },
};

const makeResponse = (body: unknown) =>
  ({ json: async () => body, ok: true }) as unknown as Response;

const BROOKLYN_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=40.67&longitude=-73.94&current_weather=true&hourly=temperature_2m,precipitation_probability";

const GENERIC_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current_weather=true";

describe("open-meteo plugin", () => {
  describe("canHandle", () => {
    it("returns true for api.open-meteo.com URLs", () => {
      expect(plugin.canHandle(BROOKLYN_URL)).toBe(true);
    });

    it("returns false for other URLs", () => {
      expect(plugin.canHandle("https://weather.com/forecast")).toBe(false);
      expect(plugin.canHandle("https://example.com")).toBe(false);
    });
  });

  describe("listItems", () => {
    it("fetches the sourceUrl directly and returns one item", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));

      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      expect(fetchFn).toHaveBeenCalledWith(BROOKLYN_URL);
      expect(items).toHaveLength(1);
    });

    it("uses 'Brooklyn Weather' for Brooklyn coordinates", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));
      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      expect(items[0]!.title).toBe("Brooklyn Weather");
      expect(items[0]!.sourceName).toBe("Brooklyn Weather");
    });

    it("falls back to 'Current Weather' for non-Brooklyn coordinates", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));
      const items = await plugin.listItems(GENERIC_URL, fetchFn);

      expect(items[0]!.title).toBe("Current Weather");
    });

    it("builds a summary containing temperature and description", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));
      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      const renderData = items[0]!.renderData;
      if ("richText" in renderData && renderData.richText) {
        expect(renderData.richText.text).toContain("8.5°C");
        expect(renderData.richText.text).toContain("Overcast");
        expect(renderData.richText.text).toContain("12.3 km/h");
      }
    });

    it("includes high/low when hourly data is present", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));
      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      const renderData = items[0]!.renderData;
      if ("richText" in renderData && renderData.richText) {
        expect(renderData.richText.text).toContain("High:");
        expect(renderData.richText.text).toContain("Low:");
      }
    });

    it("uses an unknown weather code fallback description", async () => {
      const response = {
        ...SAMPLE_RESPONSE,
        current: { ...SAMPLE_RESPONSE.current, weather_code: 999 },
      };
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(response));
      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      const renderData = items[0]!.renderData;
      if ("richText" in renderData && renderData.richText) {
        expect(renderData.richText.text).toContain("Weather code 999");
      }
    });

    it("URL is date-suffixed for replace-mode dedup", async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeResponse(SAMPLE_RESPONSE));
      const items = await plugin.listItems(BROOKLYN_URL, fetchFn);

      expect(items[0]!.url).toMatch(/#\d{4}-\d{2}-\d{2}$/);
    });

    it("throws on 500 server error (json returns empty object, data.current is undefined)", async () => {
      const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(500));
      const err = await plugin.listItems(BROOKLYN_URL, fetchFn).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
    });

    it("throws on 429 rate limit response (json returns empty object, data.current is undefined)", async () => {
      const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(429));
      const err = await plugin.listItems(BROOKLYN_URL, fetchFn).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
    });

    it("throws on 404 not found response (json returns empty object, data.current is undefined)", async () => {
      const fetchFn = vi.fn().mockResolvedValueOnce(makeErrorResponse(404));
      const err = await plugin.listItems(BROOKLYN_URL, fetchFn).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
    });
  });
});
