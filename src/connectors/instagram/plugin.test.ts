import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import plugin from "./index.ts";
import { FeedError } from "../types.js";

const makeResponse = (body: unknown) =>
  ({ json: async () => body, ok: true }) as unknown as Response;

describe("instagram plugin", () => {
  describe("canHandle", () => {
    it("returns true for instagram.com URLs", () => {
      expect(plugin.canHandle("https://www.instagram.com/nasa/")).toBe(true);
    });

    it("returns false for non-Instagram URLs", () => {
      expect(plugin.canHandle("https://twitter.com/nasa")).toBe(false);
      expect(plugin.canHandle("https://example.com")).toBe(false);
    });
  });

  describe("listItems", () => {
    const originalEnv = process.env["FIRECRAWL_API_KEY"];

    beforeEach(() => {
      process.env["FIRECRAWL_API_KEY"] = "test-api-key";
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env["FIRECRAWL_API_KEY"];
      } else {
        process.env["FIRECRAWL_API_KEY"] = originalEnv;
      }
    });

    it("throws a FeedError with missing_credential when FIRECRAWL_API_KEY is not set", async () => {
      delete process.env["FIRECRAWL_API_KEY"];
      const fetchFn = vi.fn();
      const error = await plugin.listItems("https://www.instagram.com/nasa/", fetchFn).catch((e) => e);
      expect(error).toBeInstanceOf(FeedError);
      expect((error as FeedError).code).toBe("missing_credential");
      expect((error as FeedError).message).toContain("FIRECRAWL_API_KEY is not set");
    });

    it("calls the Firecrawl API with correct args and returns one item", async () => {
      const mockMarkdown = "Post content here. ".repeat(30); // >500 chars
      const fetchFn = vi.fn().mockResolvedValue(
        makeResponse({
          success: true,
          data: { markdown: mockMarkdown, html: "<p>Post content here.</p>" },
        })
      );

      const items = await plugin.listItems("https://www.instagram.com/nasa/", fetchFn);

      expect(fetchFn).toHaveBeenCalledWith(
        "https://api.firecrawl.dev/v1/scrape",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );

      expect(items).toHaveLength(1);
      const item = items[0]!;
      expect(item.title).toBe("Recent posts from @nasa");
      expect(item.sourceName).toBe("@nasa");
      // URL should contain the profile URL and today's date
      expect(item.url).toMatch(/^https:\/\/www\.instagram\.com\/nasa\/#\d{4}-\d{2}-\d{2}$/);
      // richText should be capped at 500 chars
      expect(item.renderData).toMatchObject({
        embed: { url: "https://www.instagram.com/nasa/" },
        richText: { text: expect.any(String) },
      });
      if ("richText" in item.renderData && item.renderData.richText) {
        expect(item.renderData.richText.text.length).toBeLessThanOrEqual(500);
      }
    });

    it("handles missing markdown gracefully", async () => {
      const fetchFn = vi.fn().mockResolvedValue(
        makeResponse({ success: true, data: { markdown: "", html: "" } })
      );

      const items = await plugin.listItems("https://www.instagram.com/nasa/", fetchFn);
      expect(items).toHaveLength(1);
      if ("richText" in items[0]!.renderData && items[0]!.renderData.richText) {
        expect(items[0]!.renderData.richText.text).toBe("");
      }
    });
  });
});
