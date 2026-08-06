import type { AuthUserDto } from "../types/api";

const SESSION_KEY = "matterready.auth.session";
export const AUTH_EXPIRED_EVENT = "matterready:auth-expired";

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  user: AuthUserDto;
}

// "Remember me" decides which Storage backs the session: sessionStorage
// (default, cleared on tab close) or localStorage (survives browser
// restarts). Only one is ever written to at a time; on read we check both
// so a session written before a page reload is still found regardless of
// which one it landed in.
function storages(): Storage[] {
  return [sessionStorage, localStorage];
}

export function readSession(): AuthSession | null {
  for (const storage of storages()) {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) continue;
    try {
      const session = JSON.parse(raw) as AuthSession;
      if (!session.accessToken || !session.user || session.expiresAt <= Date.now()) {
        storage.removeItem(SESSION_KEY);
        continue;
      }
      return session;
    } catch {
      storage.removeItem(SESSION_KEY);
    }
  }
  return null;
}

export function writeSession(session: AuthSession, remember = false): void {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(SESSION_KEY);
  target.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  for (const storage of storages()) storage.removeItem(SESSION_KEY);
}
