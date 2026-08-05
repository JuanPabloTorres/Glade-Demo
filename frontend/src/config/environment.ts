const defaultApiBaseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";

export const environment = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  isDevelopment: import.meta.env.DEV,
} as const;
