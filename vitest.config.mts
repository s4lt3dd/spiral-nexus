import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // `@/*` -> `./*` alias comes straight from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
    // The default `forks` pool can be slow to hand off workers on a cold cache
    // and trip Vitest's 60s worker-start timeout; threads start reliably on
    // both Windows and CI Linux. The suite runs in ~7s either way.
    pool: "threads",
  },
});
