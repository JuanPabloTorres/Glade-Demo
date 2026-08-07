import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import flowbiteReact from "flowbite-react/plugin/vite";
import { defineConfig } from "vitest/config";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appVersion = readFileSync(resolve(repositoryRoot, "VERSION"), "utf8").trim();

export default defineConfig(({ mode }) => ({
  // Vitest runs with mode "test". Tailwind and the Flowbite plugin exist to
  // produce CSS and the class-list codegen for a *build*; a unit test asserts
  // on the DOM and never reads either. Loading them under Vitest cost a
  // `.flowbite-react/class-list.json` regeneration on every run and left a file
  // watcher open afterwards — the "close timed out after 10000ms / something
  // prevents Vite server from exiting" that added ~10s of dead time to a suite
  // whose tests take 4s.
  plugins: mode === "test" ? [react()] : [react(), tailwindcss(), flowbiteReact()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    // Building a jsdom per test file dominated the run: 88 tests took 4.3s of
    // actual test time inside a 56s wall clock, with ~237s of cumulative
    // environment construction across workers. `isolate: false` reuses one
    // environment per worker instead of one per file.
    //
    // This is safe here only because the suite already cleans up after itself:
    // `src/test/setup.ts` calls `cleanup()` in a global afterEach, and the two
    // storage-dependent suites (auth/session, api/http) clear their own storage
    // in beforeEach. A new test that leaks global state across files would
    // surface as a failure that only reproduces in a full run — if that
    // happens, quarantine that file rather than turning isolation back on for
    // all of them.
    isolate: false,
    pool: "threads",
  },
}));
