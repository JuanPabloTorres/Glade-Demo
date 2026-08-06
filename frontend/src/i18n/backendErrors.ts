import { i18n } from "./i18n";

export interface ApiErrorPayload {
  code?: string;
  messageKey?: string;
  parameters?: Record<string, string | number | boolean>;
  message?: string;
}

export function resolveApiErrorMessage(payload: ApiErrorPayload | null | undefined): string {
  if (payload?.messageKey) {
    const translated = i18n.t(payload.messageKey, payload.parameters ?? {});
    if (translated && translated !== payload.messageKey) {
      return translated;
    }
  }
  if (payload?.code) {
    const key = `errors.codes.${payload.code}`;
    const translated = i18n.t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }
  return payload?.message || i18n.t("errors:fallback");
}
