import { describe, it, expect, vi } from "vitest";
import plugin from "./index.ts";

describe("default plugin", () => {
  describe("canHandle", () => {
    it("returns true for any URL", () => {
      expect(plugin.canHandle("https://example.com")).toBe(true);
      expect(plugin.canHandle("https://instagram.com/nasa")).toBe(true);
      expect(plugin.canHandle("")).toBe(true);
    });
  });

  describe("listItems", () => {
    it("returns an empty array", async () => {
      const fetchFn = vi.fn();
      const items = await plugin.listItems("https://example.com", fetchFn);
      expect(items).toEqual([]);
    });

    it("never calls fetchFn", async () => {
      const fetchFn = vi.fn();
      await plugin.listItems("https://example.com", fetchFn);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("logs a warning with the source URL", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const fetchFn = vi.fn();

      await plugin.listItems("https://example.com/feed", fetchFn);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://example.com/feed")
      );
      warnSpy.mockRestore();
    });
  });
});
