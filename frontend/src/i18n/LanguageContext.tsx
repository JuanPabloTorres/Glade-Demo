import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { i18n } from "./i18n";
import {
  LANGUAGE_STORAGE_KEY,
  resolveLanguage,
  toLocale,
  type AppLanguage,
} from "./languages";

interface LanguageContextValue {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): string | null {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    resolveLanguage({
      profileLanguage: null,
      persistedLanguage: readStoredLanguage(),
      browserLanguage: navigator.language,
    }),
  );

  useEffect(() => {
    const resolved = resolveLanguage({
      profileLanguage: user?.preferred_language,
      persistedLanguage: readStoredLanguage(),
      browserLanguage: navigator.language,
    });
    setLanguageState(resolved);
  }, [user?.preferred_language]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  }, [language]);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({ language, locale: toLocale(language), setLanguage }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
