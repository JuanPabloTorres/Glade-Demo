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
    // Module mocks in this suite intentionally replace application-wide
    // contexts (AuthContext, BankruptcyWorkspaceContext, router hooks, etc.).
    // Reusing one module graph across files made those mocks leak into later
    // suites after LanguageProvider began consuming AuthContext, producing
    // empty renders while individual tests still passed. File isolation is a
    // correctness boundary here, not optional overhead: each test file must
    // receive a fresh module graph. The build-only Tailwind/Flowbite plugins
    // remain disabled in test mode above, preserving the larger startup win.
    isolate: true,
    pool: "threads",
  },
}));
