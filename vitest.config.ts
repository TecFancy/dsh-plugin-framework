import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * Node environment by default; client UI tests opt into jsdom with a
 * `// @vitest-environment jsdom` docblock. v8 coverage enforces the same red
 * line as the dsh-auth-gate baseline. `client/*` path aliases mirror
 * tsconfig.client.json so tests can use the same import specifiers as source.
 */
export default defineConfig({
  resolve: {
    alias: {
      "client/features": fileURLToPath(new URL("./src/client/features", import.meta.url)),
      "client/entities": fileURLToPath(new URL("./src/client/entities", import.meta.url)),
      "client/shared": fileURLToPath(new URL("./src/client/shared", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
