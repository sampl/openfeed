import { describe, it, expect, vi } from "vitest";
import gmailPlugin from "./index.ts";
import { FeedError } from "../types.js";

describe("gmail canHandle", () => {
  it("returns true for mail.google.com URLs", () => {
    expect(gmailPlugin.canHandle("https://mail.google.com")).toBe(true);
  });

  it("returns true for gmail.com URLs", () => {
    expect(gmailPlugin.canHandle("https://gmail.com")).toBe(true);
  });

  it("returns false for non-Gmail URLs", () => {
    expect(gmailPlugin.canHandle("https://outlook.com")).toBe(false);
  });
});

describe("gmail listItems", () => {
  it("throws a FeedError with missing_credential", async () => {
    const fetchFn = vi.fn();

    const error = await gmailPlugin.listItems("https://mail.google.com", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(FeedError);
    expect((error as FeedError).code).toBe("missing_credential");
    expect((error as FeedError).message).toContain("OAuth");
  });
});
