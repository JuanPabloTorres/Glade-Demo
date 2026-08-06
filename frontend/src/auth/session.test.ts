import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, readSession, writeSession } from "./session";
import type { AuthUserDto } from "../types/api";

const user: AuthUserDto = { id: "client-demo", email: "client@freshstart.demo", name: "Elena Rivera", role: "client" };

describe("session storage (expiry handling)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(readSession()).toBeNull();
  });

  it("round-trips a valid, unexpired session", () => {
    writeSession({ accessToken: "token-123", expiresAt: Date.now() + 60_000, user });
    const session = readSession();
    expect(session?.accessToken).toBe("token-123");
    expect(session?.user.email).toBe(user.email);
  });

  it("treats an expired session as absent and clears it (the '401 -> forced logout' path relies on this)", () => {
    writeSession({ accessToken: "token-123", expiresAt: Date.now() - 1, user });
    expect(readSession()).toBeNull();
    expect(sessionStorage.getItem("matterready.auth.session")).toBeNull();
  });

  it("treats corrupted session data as absent rather than throwing", () => {
    sessionStorage.setItem("matterready.auth.session", "{not json");
    expect(readSession()).toBeNull();
  });

  it("clearSession removes the stored session", () => {
    writeSession({ accessToken: "token-123", expiresAt: Date.now() + 60_000, user });
    clearSession();
    expect(readSession()).toBeNull();
  });

  it("remember=true persists to localStorage instead of sessionStorage", () => {
    writeSession({ accessToken: "token-123", expiresAt: Date.now() + 60_000, user }, true);
    expect(sessionStorage.getItem("matterready.auth.session")).toBeNull();
    expect(localStorage.getItem("matterready.auth.session")).not.toBeNull();
    expect(readSession()?.accessToken).toBe("token-123");
  });

  it("switching remember preference clears the previous storage's copy", () => {
    writeSession({ accessToken: "remembered", expiresAt: Date.now() + 60_000, user }, true);
    writeSession({ accessToken: "not-remembered", expiresAt: Date.now() + 60_000, user }, false);
    expect(localStorage.getItem("matterready.auth.session")).toBeNull();
    expect(readSession()?.accessToken).toBe("not-remembered");
  });

  it("clearSession removes a remembered (localStorage) session too", () => {
    writeSession({ accessToken: "token-123", expiresAt: Date.now() + 60_000, user }, true);
    clearSession();
    expect(readSession()).toBeNull();
    expect(localStorage.getItem("matterready.auth.session")).toBeNull();
  });
});
