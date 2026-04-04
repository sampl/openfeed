// @vitest-environment node
import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadConfig } from "./config.js";

const writeTempConfig = (content: string): string => {
  const dir = join(tmpdir(), "openfeed-config-tests");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `config-${Date.now()}-${Math.random().toString(36).slice(2)}.yaml`);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
};

const cleanupFile = (filePath: string): void => {
  try {
    unlinkSync(filePath);
  } catch {
    // ignore cleanup failures
  }
};

describe("loadConfig", () => {
  it("loads a valid YAML config with all required fields", () => {
    const filePath = writeTempConfig(`
port: 4000
schedule: "0 8 * * *"
feeds:
  - name: "Main"
    sources:
      - name: "My Blog"
        url: "https://example.com/feed.xml"
`);

    try {
      const config = loadConfig(filePath);
      expect(config.port).toBe(4000);
      expect(config.schedule).toBe("0 8 * * *");
      expect(config.feeds).toHaveLength(1);
      expect(config.feeds[0].name).toBe("Main");
      expect(config.feeds[0].sources[0].name).toBe("My Blog");
      expect(config.feeds[0].sources[0].url).toBe("https://example.com/feed.xml");
    } finally {
      cleanupFile(filePath);
    }
  });

  it("throws with clear message when feeds is missing", () => {
    const filePath = writeTempConfig(`
port: 3000
`);

    try {
      expect(() => loadConfig(filePath)).toThrow(
        '[openfeed] Config must include a non-empty "feeds" array'
      );
    } finally {
      cleanupFile(filePath);
    }
  });

  it("applies default port 3000 when port is omitted", () => {
    const filePath = writeTempConfig(`
feeds:
  - name: "Main"
    sources:
      - name: "Feed"
        url: "https://example.com/feed.xml"
`);

    try {
      const config = loadConfig(filePath);
      expect(config.port).toBe(3000);
    } finally {
      cleanupFile(filePath);
    }
  });

  it("applies default schedule when schedule is omitted", () => {
    const filePath = writeTempConfig(`
feeds:
  - name: "Main"
    sources:
      - name: "Feed"
        url: "https://example.com/feed.xml"
`);

    try {
      const config = loadConfig(filePath);
      expect(config.schedule).toBe("0 7 * * *");
    } finally {
      cleanupFile(filePath);
    }
  });

  it("parses the connector field when provided", () => {
    const filePath = writeTempConfig(`
feeds:
  - name: "Main"
    sources:
      - name: "Forced RSS"
        url: "https://example.com"
        connector: rss
`);

    try {
      const config = loadConfig(filePath);
      expect(config.feeds[0].sources[0].connector).toBe("rss");
    } finally {
      cleanupFile(filePath);
    }
  });

  it("leaves connector undefined when not provided", () => {
    const filePath = writeTempConfig(`
feeds:
  - name: "Main"
    sources:
      - name: "Feed"
        url: "https://example.com/feed.xml"
`);

    try {
      const config = loadConfig(filePath);
      expect(config.feeds[0].sources[0].connector).toBeUndefined();
    } finally {
      cleanupFile(filePath);
    }
  });

  it("throws when connector field is not a string", () => {
    const filePath = writeTempConfig(`
feeds:
  - name: "Main"
    sources:
      - name: "Feed"
        url: "https://example.com/feed.xml"
        connector: 123
`);

    try {
      expect(() => loadConfig(filePath)).toThrow(
        'feeds[0].sources[0].connector must be a string'
      );
    } finally {
      cleanupFile(filePath);
    }
  });
});
