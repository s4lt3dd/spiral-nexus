import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Shared by both projects: the `@/*` -> `./*` alias comes straight from
// tsconfig.json, and the React plugin handles JSX in the component suite.
const shared = {
  plugins: [react()],
  resolve: { tsconfigPaths: true },
};

const common = {
  globals: true,
  restoreMocks: true,
  clearMocks: true,
  // The default `forks` pool is very slow to hand off workers on Windows and
  // times out before the first suite runs; threads start reliably on both
  // Windows and CI Linux.
  pool: "threads" as const,
};

export default defineConfig({
  test: {
    // Two projects so the pure-logic suite never pays for a DOM. Building a
    // jsdom per file dominated startup and, on a cold node_modules, pushed the
    // run past Vitest's fixed 60s worker-start timeout.
    projects: [
      {
        ...shared,
        test: {
          ...common,
          name: "lib",
          environment: "node",
          include: ["test/lib/**/*.test.ts"],
          // Distinct group orders run the two projects back to back rather
          // than competing for worker slots (and Vitest requires them once the
          // projects differ in worker count).
          sequence: { groupOrder: 0 },
        },
      },
      {
        ...shared,
        test: {
          ...common,
          name: "components",
          environment: "jsdom",
          setupFiles: ["./test/setup.ts"],
          include: ["test/components/**/*.test.tsx"],
          // Importing jsdom through Vite costs ~20s per isolated worker, which
          // on a cold cache ran into Vitest's fixed 60s worker-start timeout.
          // One worker sharing one module registry imports it once. Tests stay
          // independent: RTL's cleanup() unmounts after every test, and the
          // component suite asserts only on what it renders itself.
          isolate: false,
          maxWorkers: 1,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
