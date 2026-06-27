import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    env: {
      // Skip live-API contract tests in CI/local when backend is not deployed.
      // Override by setting SKIP_CONTRACT_TESTS=false in your shell before running tests.
      SKIP_CONTRACT_TESTS: process.env.SKIP_CONTRACT_TESTS ?? "true",
    },
  },
});
