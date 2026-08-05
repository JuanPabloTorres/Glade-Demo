import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
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
      command: "uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/v1/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: "sqlite:///./matter_ready_e2e.db",
        CORS_ORIGINS: "http://127.0.0.1:5173",
      },
    },
    {
      name: "web",
      command: "npm run dev -- --host 127.0.0.1",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:8000",
        VITE_DEMO_STORAGE: "browser",
      },
    },
  ],
});
