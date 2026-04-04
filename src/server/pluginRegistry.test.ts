// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resolvePlugin } from "./pluginRegistry.js";

describe("resolvePlugin", () => {
  it("resolves by URL when no plugin name is given", () => {
    // URL with a path avoids the substack-rss bare-domain heuristic
    const plugin = resolvePlugin("https://news.ycombinator.com/news");
    expect(plugin.name).toBe("hacker-news");
  });

  it("returns the default plugin for unrecognised URLs", () => {
    // URL with a path avoids the substack-rss bare-domain heuristic
    const plugin = resolvePlugin("https://totally-unknown-site.example.com/posts");
    expect(plugin.name).toBe("default");
  });

  it("forces a specific plugin by name regardless of URL", () => {
    // URL looks like a generic site, but we force the rss plugin
    const plugin = resolvePlugin("https://example.com", "rss");
    expect(plugin.name).toBe("rss");
  });

  it("throws when the forced connector name is unknown", () => {
    expect(() => resolvePlugin("https://example.com", "non-existent-plugin")).toThrow(
      'Unknown connector: "non-existent-plugin"'
    );
  });

  it("resolves reddit URLs to the reddit plugin", () => {
    const plugin = resolvePlugin("https://www.reddit.com/r/programming");
    expect(plugin.name).toBe("reddit");
  });

  it("resolves bsky.app URLs to the bluesky plugin", () => {
    const plugin = resolvePlugin("https://bsky.app/profile/user.bsky.social");
    expect(plugin.name).toBe("bluesky");
  });
});
