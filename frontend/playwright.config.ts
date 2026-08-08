import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Ports are env-overridable so a linked worktree can run its own e2e pass
 * without colliding with the servers another checkout already has on the
 * defaults.
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8000);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;

/**
 * Release mode, set by `scripts/agent/release-verify.mjs`.
 *
 * Local development reuses whatever server is already up, which is a
 * convenience there and a hazard here: `reuseExistingServer` accepts anything
 * answering on the port, and this repository routinely has eight checkouts
 * live. A release run once reported four language failures that turned out to
 * be a sibling worktree's dev server — the suite was measuring another branch.
 *
 * In release mode the run starts its own servers on ports the harness asked the
 * OS for, and `global-setup.ts` refuses to continue unless the build being
 * served reports this checkout's VERSION.
 */
const RELEASE = process.env.E2E_RELEASE === "1";

const APP_VERSION = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    /**
     * No global locale.
     *
     * This used to pin every run to `es-PR`, which meant no test ever arrived
     * the way a first-time visitor does — and that is exactly how a defect
     * shipped where an English UI rendered a Spanish case file. A global locale
     * makes one language the invisible default and the other untested.
     *
     * Suites that assert language now declare it themselves with
     * `test.use({ locale })`, so a spec's language is readable in the spec.
     * Everything else runs on Playwright's own default, which is the honest
     * "some browser" case.
     */
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "api",
      command: `uv run uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT}`,
      cwd: "../backend",
      url: `${API_URL}/api/v1/health`,
      timeout: 120_000,
      // Never reused in release mode: a long-lived API also accumulates SQLite
      // lock contention across runs, which shows up as unrelated flaky specs.
      reuseExistingServer: !process.env.CI && !RELEASE,
      env: {
        DATABASE_URL: RELEASE
          ? `sqlite:///./matter_ready_e2e_${API_PORT}.db`
          : "sqlite:///./matter_ready_e2e.db",
        CORS_ORIGINS: WEB_URL,
      },
    },
    {
      name: "web",
      command: `npm run dev -- --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: ".",
      url: WEB_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI && !RELEASE,
      env: {
        VITE_API_BASE_URL: API_URL,
        VITE_DEMO_STORAGE: "browser",
        // Pinned so the served bundle can be checked against this checkout.
        VITE_APP_VERSION_EXPECTED: APP_VERSION,
      },
    },
  ],
});
