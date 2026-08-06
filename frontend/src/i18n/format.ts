import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, LOCALE_BY_LANGUAGE, type AppLanguage } from "./languages";

function readActiveLanguage(): AppLanguage {
  const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (raw === "en" || raw === "es") return raw;
  return DEFAULT_LANGUAGE;
}

export function getActiveLocale(): string {
  return LOCALE_BY_LANGUAGE[readActiveLanguage()];
}

export function formatDate(value: Date | string | number, locale = getActiveLocale()): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | number, locale = getActiveLocale()): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: Date | string | number, locale = getActiveLocale()): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCurrency(value: number, locale = getActiveLocale(), currency = "USD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, locale = getActiveLocale()): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number, locale = getActiveLocale()): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale = getActiveLocale()): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}
