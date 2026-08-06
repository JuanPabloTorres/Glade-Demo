import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_EXPIRED_EVENT, readSession, writeSession } from "../auth/session";
import { http } from "./http";
import type { AuthUserDto } from "../types/api";

const user: AuthUserDto = { id: "client-demo", email: "client@freshstart.demo", name: "Elena Rivera", role: "client" };

describe("http client — 401 handling (session expiry)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("attaches the bearer token from the stored session, and rejects with the same error while clearing the session on a 401", async () => {
    writeSession({ accessToken: "token-abc", expiresAt: Date.now() + 60_000, user });
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    let capturedAuthHeader: string | undefined;
    // A custom adapter is the supported way to exercise axios's real
    // request/response interceptor chain end-to-end without reaching into
    // axios's private interceptor-handler internals.
    http.defaults.adapter = (config) => {
      capturedAuthHeader = (config.headers as Record<string, string>).Authorization;
      const error = { isAxiosError: true, response: { status: 401, data: {}, statusText: "Unauthorized", headers: {}, config } };
      return Promise.reject(error);
    };

    await expect(http.get("/api/v1/bankruptcy/analyze")).rejects.toMatchObject({ response: { status: 401 } });

    expect(capturedAuthHeader).toBe("Bearer token-abc");
    expect(readSession()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});
