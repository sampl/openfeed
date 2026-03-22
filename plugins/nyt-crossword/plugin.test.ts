import { describe, it, expect, vi } from "vitest";
import nytCrosswordPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_PUZZLES_RESPONSE = {
  results: [
    {
      puzzle_id: 1001,
      print_date: "2024-01-15",
      title: null,
      publish_type: "daily",
    },
    {
      puzzle_id: 1002,
      print_date: "2024-01-14",
      title: "Monday Puzzle",
      publish_type: "daily",
    },
  ],
};

describe("nyt-crossword canHandle", () => {
  it("returns true for NYT crossword URLs", () => {
    expect(
      nytCrosswordPlugin.canHandle("https://www.nytimes.com/crosswords")
    ).toBe(true);
  });

  it("returns false for nytimes.com URLs without 'crossword'", () => {
    expect(
      nytCrosswordPlugin.canHandle("https://nytimes.com/games/wordle")
    ).toBe(false);
  });
});

describe("nyt-crossword listItems", () => {
  it("throws a FeedError with missing_credential when no apiKey in options", async () => {
    const fetchFn = vi.fn();

    const error = await nytCrosswordPlugin.listItems(
      "https://www.nytimes.com/crosswords",
      fetchFn
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("missing_credential");
    expect((error as FeedError).message).toContain("API key");
  });

  it("throws a FeedError with auth_error on 401 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 } as unknown as Response);
    const error = await nytCrosswordPlugin.listItems(
      "https://www.nytimes.com/crosswords",
      fetchFn,
      { apiKey: "bad-key" }
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("auth_error");
  });

  it("throws a FeedError with rate_limited on 429 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 429 } as unknown as Response);
    const error = await nytCrosswordPlugin.listItems(
      "https://www.nytimes.com/crosswords",
      fetchFn,
      { apiKey: "test-key" }
    ).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });

  it("returns items with correct URLs and titles from mocked API response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_PUZZLES_RESPONSE,
    } as unknown as Response);

    const items = await nytCrosswordPlugin.listItems(
      "https://www.nytimes.com/crosswords",
      fetchFn,
      { apiKey: "test-key" }
    );

    expect(items).toHaveLength(2);

    const first = items[0]!;
    // puzzle with null title should fall back to "NYT Crossword - {print_date}"
    expect(first.title).toBe("NYT Crossword - 2024-01-15");
    expect(first.url).toBe(
      "https://www.nytimes.com/crosswords/game/daily/2024-01-15"
    );
    expect(first.renderData).toMatchObject({
      richText: { text: "NYT Crossword - 2024-01-15" },
    });

    const second = items[1]!;
    expect(second.title).toBe("Monday Puzzle");
    expect(second.url).toBe(
      "https://www.nytimes.com/crosswords/game/daily/2024-01-14"
    );
  });
});
