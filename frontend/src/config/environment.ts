const defaultApiBaseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
const configuredDemoStorage = import.meta.env.VITE_DEMO_STORAGE;

export const environment = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  isDevelopment: import.meta.env.DEV,
  useBrowserDemoStore:
    configuredDemoStorage === "browser" ||
    (configuredDemoStorage !== "remote" && import.meta.env.PROD),
} as const;
