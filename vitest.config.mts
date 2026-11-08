import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/unit/**/*.test.ts", "tests/unit/**/*.test.mjs"],
    coverage: {
      reporter: ["text", "json-summary"],
      include: ["src/lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
});
