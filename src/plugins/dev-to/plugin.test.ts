import { describe, it, expect, vi } from "vitest";
import devToPlugin from "./index.ts";
import { FeedError } from "../types.js";

const SAMPLE_ARTICLES: Array<{
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  user: { name: string };
}> = [
  {
    id: 1,
    title: "Getting started with TypeScript",
    description: "A beginner's guide to TypeScript",
    url: "https://dev.to/user1/getting-started-with-typescript-abc",
    published_at: "2024-01-15T10:00:00.000Z",
    user: { name: "User One" },
  },
  {
    id: 2,
    title: "Advanced React patterns",
    description: "Deep dive into React patterns",
    url: "https://dev.to/user2/advanced-react-patterns-def",
    published_at: "2024-01-14T08:00:00.000Z",
    user: { name: "User Two" },
  },
];

describe("dev-to canHandle", () => {
  it("returns true for dev.to URLs", () => {
    expect(devToPlugin.canHandle("https://dev.to")).toBe(true);
    expect(devToPlugin.canHandle("https://dev.to/@username")).toBe(true);
    expect(devToPlugin.canHandle("https://dev.to/t/javascript")).toBe(true);
  });

  it("returns false for non-dev.to URLs", () => {
    expect(devToPlugin.canHandle("https://github.com")).toBe(false);
    expect(devToPlugin.canHandle("https://medium.com")).toBe(false);
  });
});

describe("dev-to listItems", () => {
  it("fetches default top articles for plain dev.to URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_ARTICLES,
    } as unknown as Response);

    const items = await devToPlugin.listItems("https://dev.to", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toContain("top=1");
    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.sourceName).toBe("DEV Community");
    expect(first.title).toBe("Getting started with TypeScript");
    expect(first.description).toBe("A beginner's guide to TypeScript");
    expect(first.url).toBe("https://dev.to/user1/getting-started-with-typescript-abc");
    expect(first.publishedAt).toEqual(new Date("2024-01-15T10:00:00.000Z"));
    expect(first.renderData).toMatchObject({
      richText: { text: "A beginner's guide to TypeScript" },
    });
  });

  it("uses username in API call for @username URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_ARTICLES,
    } as unknown as Response);

    await devToPlugin.listItems("https://dev.to/@janesmith", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toContain("username=janesmith");
    expect(fetchFn.mock.calls[0]?.[0]).not.toContain("top=1");
  });

  it("uses tag in API call for /t/tag URL", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_ARTICLES,
    } as unknown as Response);

    await devToPlugin.listItems("https://dev.to/t/javascript", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toContain("tag=javascript");
  });

  it("respects limit option", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    await devToPlugin.listItems("https://dev.to", fetchFn, { limit: 20 });

    expect(fetchFn.mock.calls[0]?.[0]).toContain("per_page=20");
  });

  it("throws a FeedError with source_not_found on 404 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response);
    const error = await devToPlugin.listItems("https://dev.to/@nobody", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("source_not_found");
  });

  it("throws a FeedError with rate_limited on 429 response", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: false, status: 429 } as unknown as Response);
    const error = await devToPlugin.listItems("https://dev.to", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("rate_limited");
  });
});
