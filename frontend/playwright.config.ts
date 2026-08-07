import { defineConfig, devices } from "@playwright/test";

/**
 * Ports are env-overridable so a linked worktree can run its own e2e pass
 * without colliding with the servers another checkout already has on the
 * defaults. `reuseExistingServer` is on locally, so without this a second
 * worktree silently tests the *first* worktree's build — the run goes green
 * against code that is not the code under test.
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8000);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The app auto-detects language from the browser locale when no
    // profile/persisted preference exists (see src/i18n/languages.ts). These
    // specs assert Spanish copy, matching the demo's default audience —
    // without this, Playwright's default en-US locale makes the app render
    // in English and every Spanish text selector times out.
    locale: "es-PR",
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
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: "sqlite:///./matter_ready_e2e.db",
        CORS_ORIGINS: WEB_URL,
      },
    },
    {
      name: "web",
      command: `npm run dev -- --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: ".",
      url: WEB_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: API_URL,
        VITE_DEMO_STORAGE: "browser",
      },
    },
  ],
});
