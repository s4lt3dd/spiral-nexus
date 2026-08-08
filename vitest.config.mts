import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Resolves the `@/*` -> `./*` alias straight from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    // The default `forks` pool is very slow to hand off workers on Windows and
    // times out before the first suite runs; threads start reliably on both
    // Windows and CI Linux.
    pool: "threads",
    restoreMocks: true,
    clearMocks: true,
  },
});
