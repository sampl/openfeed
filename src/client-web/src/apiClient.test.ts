// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchItems,
  updateItemStatus,
  triggerFetch,
  fetchRuns,
  fetchFeeds,
  fetchTimeLimits,
  fetchTimeUsage,
  recordTimeSession,
} from "./apiClient";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Creates a mock Response object with the given status and JSON body.
const makeJsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? "OK" : "Error",
  json: vi.fn().mockResolvedValue(body),
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("apiClient error handling", () => {
  describe("fetchItems", () => {
    it("returns items on success", async () => {
      const payload = { items: [{ id: "1" }], hasMore: false, total: 1 };
      mockFetch.mockResolvedValue(makeJsonResponse(200, payload));

      const result = await fetchItems("unread");
      expect(result.items).toHaveLength(1);
    });

    it("throws with the server error message on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "",
        json: vi.fn().mockResolvedValue({ error: "Database is unavailable right now." }),
      });

      await expect(fetchItems("unread")).rejects.toThrow("Database is unavailable right now.");
    });

    it("falls back to status code when the error body has no message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "",
        json: vi.fn().mockResolvedValue({}),
      });

      await expect(fetchItems("unread")).rejects.toThrow("status 503");
    });

    it("falls back to statusText when the error body is not JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn().mockRejectedValue(new SyntaxError("not JSON")),
      });

      await expect(fetchItems("unread")).rejects.toThrow("Internal Server Error");
    });

    it("builds the correct URL with all params", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { items: [], hasMore: false, total: 0 }));

      await fetchItems("archived", "Tech", 10, 30);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=archived");
      expect(url).toContain("feed=Tech");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=30");
    });
  });

  describe("updateItemStatus", () => {
    it("sends a PATCH request with the correct body", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { success: true }));

      await updateItemStatus("item-1", "archived");

      expect(mockFetch).toHaveBeenCalledWith("/api/items/item-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      }));
    });

    it("throws with the server error message on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "",
        json: vi.fn().mockResolvedValue({ error: '"deleted" is not a valid item status.' }),
      });

      await expect(updateItemStatus("item-1", "archived")).rejects.toThrow("is not a valid item status");
    });
  });

  describe("triggerFetch", () => {
    it("returns the run ID on success", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { success: true, runId: "run-abc" }));

      const result = await triggerFetch();
      expect(result.runId).toBe("run-abc");
    });

    it("throws with the server error message on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "",
        json: vi.fn().mockResolvedValue({ error: "The fetch could not be started. Config file missing." }),
      });

      await expect(triggerFetch()).rejects.toThrow("Config file missing");
    });
  });

  describe("fetchRuns", () => {
    it("returns runs on success", async () => {
      const runs = [{ id: "run-1" }, { id: "run-2" }];
      mockFetch.mockResolvedValue(makeJsonResponse(200, runs));

      const result = await fetchRuns();
      expect(result).toHaveLength(2);
    });

    it("appends limit param when provided", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, []));

      await fetchRuns(25);

      expect(mockFetch.mock.calls[0][0]).toContain("?limit=25");
    });

    it("throws with the server error message on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "",
        json: vi.fn().mockResolvedValue({ error: "Could not load fetch history. Please try again." }),
      });

      await expect(fetchRuns()).rejects.toThrow("Could not load fetch history");
    });
  });

  describe("fetchFeeds", () => {
    it("returns feeds on success", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, [{ name: "Tech" }]));

      const result = await fetchFeeds();
      expect(result[0].name).toBe("Tech");
    });
  });

  describe("fetchTimeLimits", () => {
    it("returns time limits on success", async () => {
      const limits = { global: { daily: 60 }, byFeed: {} };
      mockFetch.mockResolvedValue(makeJsonResponse(200, limits));

      const result = await fetchTimeLimits();
      expect(result.global).toEqual({ daily: 60 });
    });
  });

  describe("fetchTimeUsage", () => {
    it("sends the correct date param", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { byFeed: {}, total: 0 }));

      await fetchTimeUsage("2024-01-15");

      expect(mockFetch.mock.calls[0][0]).toContain("date=2024-01-15");
    });
  });

  describe("recordTimeSession", () => {
    it("sends the correct body", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { success: true }));

      await recordTimeSession("Tech", 30000, "2024-01-15");

      expect(mockFetch).toHaveBeenCalledWith("/api/time/sessions", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ feedName: "Tech", durationMs: 30000, date: "2024-01-15" }),
      }));
    });

    it("omits feedName when null is passed", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse(200, { success: true }));

      await recordTimeSession(null, 15000, "2024-01-15");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { feedName?: string };
      expect(body.feedName).toBeUndefined();
    });
  });
});
