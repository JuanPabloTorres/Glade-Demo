import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/LanguageContext";
import { AppIcon } from "../atoms/AppIcon";

interface LanguageToggleProps {
  /** Hides the spelled-out language name, keeping only the two-letter code. */
  compact?: boolean;
  className?: string;
}

/**
 * Direct EN <-> ES toggle.
 *
 * This was a Flowbite `Dropdown` holding exactly two items, which meant two
 * interactions and a focus trap to reach a binary choice. With two languages
 * the menu carries no information the button cannot show by itself, so this is
 * a single button that swaps the language on activation.
 *
 * It shows the language it will switch *to*, so the label is the outcome of
 * pressing it. That is the ambiguous part of any language toggle, so the
 * ambiguity is resolved in text, not left to convention: the accessible name
 * and the `title` both spell out "Switch to English" / "Cambiar a Español",
 * naming the destination language explicitly.
 *
 * Behaviour is identical at every breakpoint — it is the same component in the
 * header on a phone and on a desktop; only the spelled-out name is dropped
 * when space is tight.
 *
 * A real `<button>`, so Enter/Space activate it and it sits in the natural tab
 * order. It calls the same `setLanguage` from LanguageContext the dropdown
 * used, so persistence and the `<html lang>` side effects are untouched.
 */
export function LanguageToggle({ compact = false, className = "" }: LanguageToggleProps) {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, setLanguage } = useLanguage();

  const next = language === "es" ? "en" : "es";
  const nextCode = next === "es" ? t("common:labels.esCode") : t("common:labels.enCode");
  const nextName = next === "es" ? t("navigation:languageToggle.es") : t("navigation:languageToggle.en");
  const switchLabel = t("navigation:languageToggle.switchTo", { language: nextName });

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={switchLabel}
      title={switchLabel}
      className={`inline-flex min-h-11 items-center gap-2 rounded-base border border-default px-2.5 py-1.5 text-xs font-semibold text-heading outline-none transition-colors hover:bg-neutral-tertiary hover:text-fg-brand focus-visible:ring-4 focus-visible:ring-brand-soft ${className}`}
    >
      <AppIcon name="language" size={16} />
      <span>{nextCode}</span>
      {compact ? null : <span className="hidden sm:inline">{nextName}</span>}
    </button>
  );
}
