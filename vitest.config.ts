import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite boots a full Postgres per suite.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
