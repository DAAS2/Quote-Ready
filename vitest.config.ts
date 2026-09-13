import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globals: true,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      // Scope: the deterministic decision layer. AI modules are covered by the
      // contract schemas and the evaluation fixtures; UI is covered by the
      // Playwright flows in scripts/. Thresholds are set just under the current
      // numbers so a regression fails the build instead of going unnoticed.
      include: ["lib/rules/**", "lib/ai/schemas.ts"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
