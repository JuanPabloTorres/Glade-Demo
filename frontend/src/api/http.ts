import axios from "axios";
import { AUTH_EXPIRED_EVENT, clearSession, readSession } from "../auth/session";
import { environment } from "../config/environment";
import { LANGUAGE_STORAGE_KEY, toLocale } from "../i18n/languages";

export const http = axios.create({
  baseURL: environment.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const session = readSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  const selected = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (selected === "en" || selected === "es") {
    config.headers["Accept-Language"] = toLocale(selected);
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSession();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);
