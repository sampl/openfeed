// @vitest-environment node
import { describe, it, expect } from "vitest";
import { resolveDbPathArg } from "./cliArgs.js";

describe("resolveDbPathArg", () => {
  it("uses default db path when --db is absent", () => {
    expect(resolveDbPathArg(["--config", "custom.yaml"])).toBe("openfeed.db");
  });

  it("uses provided db path when --db is present", () => {
    expect(resolveDbPathArg(["--config", "custom.yaml", "--db", "custom.db"])).toBe("custom.db");
  });
});
