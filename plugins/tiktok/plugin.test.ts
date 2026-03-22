import { describe, it, expect, vi } from "vitest";
import tiktokPlugin from "./index.ts";
import { FeedError } from "../types.js";

describe("tiktok canHandle", () => {
  it("returns true for tiktok.com URLs", () => {
    expect(tiktokPlugin.canHandle("https://www.tiktok.com/@user")).toBe(true);
  });

  it("returns false for non-TikTok URLs", () => {
    expect(tiktokPlugin.canHandle("https://youtube.com")).toBe(false);
  });
});

describe("tiktok listItems", () => {
  it("throws a FeedError with source_not_found", async () => {
    const fetchFn = vi.fn();

    const error = await tiktokPlugin.listItems("https://www.tiktok.com/@user", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
    expect((error as FeedError).message).toContain("public API");
  });
});
