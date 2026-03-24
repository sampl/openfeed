import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // globals: true is required so @testing-library/jest-dom can call expect.extend()
    globals: true,
    // Default to jsdom for frontend tests
    environment: "jsdom",
    setupFiles: ["./src/client-web/src/test-setup.ts"],
    // Use node environment for server and plugin tests
    environmentMatchPatterns: [
      ["src/server/**/*.test.ts", "node"],
      ["src/plugins/**/*.test.ts", "node"],
    ],
  },
});
