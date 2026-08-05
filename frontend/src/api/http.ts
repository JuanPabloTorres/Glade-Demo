import axios from "axios";
import { AUTH_EXPIRED_EVENT, clearSession, readSession } from "../auth/session";
import { environment } from "../config/environment";

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
