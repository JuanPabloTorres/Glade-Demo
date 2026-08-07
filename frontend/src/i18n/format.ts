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

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * Compact file size for an attachment caption, e.g. `2.4 MB`.
 *
 * The unit symbols are deliberately not translated: KB/MB/GB are written the
 * same way in both of the app's languages, so routing them through i18n would
 * add two identical string tables. Only the number is localized.
 */
export function formatFileSize(bytes: number, locale = getActiveLocale()): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${FILE_SIZE_UNITS[0]}`;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: exponent === 0 ? 0 : 1,
  }).format(value)} ${FILE_SIZE_UNITS[exponent]}`;
}
