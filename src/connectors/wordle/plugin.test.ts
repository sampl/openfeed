import { describe, it, expect, vi } from "vitest";
import wordlePlugin from "./index.ts";
import { FeedError } from "../types.js";

describe("wordle canHandle", () => {
  it("returns true for NYT Wordle URLs", () => {
    expect(
      wordlePlugin.canHandle("https://www.nytimes.com/games/wordle/index.html")
    ).toBe(true);
  });

  it("returns false for nytimes.com URLs without 'wordle'", () => {
    expect(wordlePlugin.canHandle("https://nytimes.com/crosswords")).toBe(false);
  });

  it("returns false for wordle on a different domain", () => {
    expect(wordlePlugin.canHandle("https://wordle.com")).toBe(false);
  });
});

describe("wordle listItems", () => {
  it("throws a FeedError with source_not_found", async () => {
    const fetchFn = vi.fn();

    const error = await wordlePlugin.listItems(
      "https://www.nytimes.com/games/wordle/index.html",
      fetchFn
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
  });
});
