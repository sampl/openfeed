import { describe, it, expect, vi } from "vitest";
import githubPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_ISSUES: object[] = [
  {
    number: 42,
    title: "Fix drag handle offset on touch devices",
    body: "When using touch input, the drag handle position is offset by 10px.",
    html_url: "https://github.com/dnd-kit/dnd-kit/issues/42",
    created_at: "2024-01-15T10:00:00.000Z",
    user: { login: "alice" },
    state: "open",
  },
  {
    number: 43,
    title: "Add keyboard accessibility support",
    body: null,
    html_url: "https://github.com/dnd-kit/dnd-kit/issues/43",
    created_at: "2024-01-16T08:00:00.000Z",
    user: { login: "bob" },
    state: "open",
  },
];

describe("github canHandle", () => {
  it("returns true for github.com/{owner}/{repo} URLs", () => {
    expect(githubPlugin.canHandle("https://github.com/dnd-kit/dnd-kit")).toBe(true);
    expect(githubPlugin.canHandle("https://github.com/facebook/react")).toBe(true);
  });

  it("returns false for bare github.com or profile-only URLs", () => {
    expect(githubPlugin.canHandle("https://github.com")).toBe(false);
    expect(githubPlugin.canHandle("https://github.com/dnd-kit")).toBe(false);
    expect(githubPlugin.canHandle("https://gitlab.com/owner/repo")).toBe(false);
  });
});

describe("github listItems", () => {
  it("maps issues to feed items with correct fields", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_ISSUES,
    } as unknown as Response);

    const items = await githubPlugin.listItems(
      "https://github.com/dnd-kit/dnd-kit",
      fetchFn
    );

    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.sourceName).toBe("dnd-kit/dnd-kit");
    expect(first.title).toBe("#42: Fix drag handle offset on touch devices");
    expect(first.url).toBe("https://github.com/dnd-kit/dnd-kit/issues/42");
    expect(first.publishedAt).toEqual(new Date("2024-01-15T10:00:00.000Z"));
    expect(first.renderData).toMatchObject({
      richText: { text: "When using touch input, the drag handle position is offset by 10px." },
    });
  });

  it("falls back to title text when issue body is null", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_ISSUES,
    } as unknown as Response);

    const items = await githubPlugin.listItems(
      "https://github.com/dnd-kit/dnd-kit",
      fetchFn
    );

    const second = items[1]!;
    expect(second.renderData).toMatchObject({
      richText: { text: "Add keyboard accessibility support" },
    });
  });

  it("uses limit option in API request", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    await githubPlugin.listItems(
      "https://github.com/dnd-kit/dnd-kit",
      fetchFn,
      { limit: 25 }
    );

    expect(fetchFn.mock.calls[0]?.[0]).toContain("per_page=25");
  });

  it("defaults to limit 10 when no options provided", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    await githubPlugin.listItems("https://github.com/dnd-kit/dnd-kit", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toContain("per_page=10");
  });

  it("throws a FeedError with source_not_found on 404 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false, status: 404, statusText: "Not Found",
    } as unknown as Response);
    const error = await githubPlugin.listItems("https://github.com/dnd-kit/dnd-kit", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
    expect((error as FeedError).message).toContain("404");
  });

  it("throws a FeedError with auth_error on 403 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false, status: 403, statusText: "Forbidden",
    } as unknown as Response);
    const error = await githubPlugin.listItems("https://github.com/dnd-kit/dnd-kit", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("auth_error");
  });

  it("throws a FeedError with rate_limited on 429 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false, status: 429, statusText: "Too Many Requests",
    } as unknown as Response);
    const error = await githubPlugin.listItems("https://github.com/dnd-kit/dnd-kit", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });

  it("throws a FeedError with invalid_config when URL cannot be parsed", async () => {
    const fetchFn = vi.fn();
    const error = await githubPlugin.listItems("https://github.com/only-one-segment", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("invalid_config");
  });
});
