// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import type { AddressInfo } from "net";
import { createConfigRouter } from "./config.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "fs";

const startTestServer = (configPath: string) =>
  new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    const app = express();
    app.use("/api/config", createConfigRouter(configPath));
    const server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        baseUrl: `http://localhost:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });

describe("config router", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ baseUrl, close } = await startTestServer("/etc/open-feed.yaml"));
  });

  afterEach(async () => {
    await close();
    vi.clearAllMocks();
  });

  it("returns the raw config file content as plain text", async () => {
    const yaml = "feeds:\n  - name: Tech\n    sources: []\n";
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(yaml);

    const res = await fetch(`${baseUrl}/api/config`);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(body).toBe(yaml);
    expect(readFileSync).toHaveBeenCalledWith("/etc/open-feed.yaml", "utf-8");
  });

  it("returns 500 when the config file cannot be read", async () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const res = await fetch(`${baseUrl}/api/config`);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toContain("config file");
  });
});
