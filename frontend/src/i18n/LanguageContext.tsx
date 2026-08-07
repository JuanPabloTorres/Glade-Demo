import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { i18n } from "./i18n";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
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

  /**
   * Apply the signed-in profile's language *only* when this device has no
   * choice of its own.
   *
   * `resolveLanguage` ranks profile above persisted, which is right for a first
   * sign-in on a new device and wrong from then on: this effect re-ran with the
   * profile value every time the user loaded, so an explicit switch to English
   * was silently reverted to the profile's Spanish on the next reload — the
   * "I select English and still get Spanish" report. Reading storage first and
   * bailing when it holds a valid choice keeps the profile as a default rather
   * than an override.
   */
  useEffect(() => {
    if (normalizeLanguage(readStoredLanguage())) return;
    const resolved = resolveLanguage({
      profileLanguage: user?.preferred_language,
      persistedLanguage: null,
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
