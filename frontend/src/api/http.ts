import axios, { AxiosHeaders, type AxiosResponse } from "axios";
import { environment } from "../config/environment";
import { recordApiTrace } from "./traceStore";

export const http = axios.create({
  baseURL: environment.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

function readHeader(response: AxiosResponse, name: string): string | undefined {
  const headers = response.headers;
  if (headers instanceof AxiosHeaders) {
    const value = headers.get(name);
    return typeof value === "string" ? value : undefined;
  }
  const value = headers[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function captureTrace(response: AxiosResponse) {
  const operationId = readHeader(response, "x-backend-operation-id");
  if (!operationId) {
    return;
  }
  recordApiTrace({
    operationId,
    method: response.config.method?.toUpperCase() ?? "UNKNOWN",
    path: response.config.url ?? "",
    controller: readHeader(response, "x-backend-controller") ?? "UnknownController",
    action: readHeader(response, "x-backend-action") ?? "unknown_action",
    traceMatch: readHeader(response, "x-trace-match") ?? "not-provided",
    status: response.status,
  });
}

http.interceptors.response.use(
  (response) => {
    captureTrace(response);
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response) {
      captureTrace(error.response);
    }
    return Promise.reject(error);
  },
);
