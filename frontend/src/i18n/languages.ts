export type AppLanguage = "es" | "en";

export const DEFAULT_LANGUAGE: AppLanguage =
  (import.meta.env.VITE_DEFAULT_LANGUAGE as AppLanguage | undefined) === "en"
    ? "en"
    : "es";

export const LANGUAGE_STORAGE_KEY = "freshstart.language";

export const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  es: "es-PR",
  en: "en-US",
};

export function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  if (!value) return null;
  const lowered = value.toLowerCase();
  if (lowered.startsWith("es")) return "es";
  if (lowered.startsWith("en")) return "en";
  return null;
}

export function resolveLanguage(sources: {
  profileLanguage?: string | null;
  persistedLanguage?: string | null;
  browserLanguage?: string | null;
}): AppLanguage {
  return (
    normalizeLanguage(sources.profileLanguage) ??
    normalizeLanguage(sources.persistedLanguage) ??
    normalizeLanguage(sources.browserLanguage) ??
    DEFAULT_LANGUAGE
  );
}

export function toLocale(language: AppLanguage): string {
  return LOCALE_BY_LANGUAGE[language];
}
