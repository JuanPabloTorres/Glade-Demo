import type { AuthUserDto } from "../types/api";

const SESSION_KEY = "matterready.auth.session";
export const AUTH_EXPIRED_EVENT = "matterready:auth-expired";

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  user: AuthUserDto;
}

export function readSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.accessToken || !session.user || session.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
