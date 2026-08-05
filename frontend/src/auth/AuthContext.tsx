import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "../api/authApi";
import type { AuthUserDto, LoginDto } from "../types/api";
import {
  AUTH_EXPIRED_EVENT,
  clearSession,
  readSession,
  writeSession,
} from "./session";

interface AuthContextValue {
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = readSession();
  const [user, setUser] = useState<AuthUserDto | null>(initialSession?.user ?? null);
  const [isInitializing, setIsInitializing] = useState(Boolean(initialSession));

  const logout = () => {
    clearSession();
    setUser(null);
  };

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  useEffect(() => {
    if (!initialSession) return;
    authApi
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => logout())
      .finally(() => setIsInitializing(false));
  }, []);

  const login = async (dto: LoginDto) => {
    const token = await authApi.login(dto);
    writeSession({
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      user: token.user,
    });
    setUser(token.user);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      logout,
    }),
    [user, isInitializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
