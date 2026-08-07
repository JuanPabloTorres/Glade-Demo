import { Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";
import { useLanguage } from "../../i18n/LanguageContext";

interface LanguageSelectorProps {
  /** Hides the spelled-out language name, keeping only the two-letter code. */
  compact?: boolean;
}

/**
 * Direct EN <-> ES toggle.
 *
 * This was a Flowbite `Dropdown` with exactly two items, which meant two
 * interactions (open the menu, pick the option) plus a focus trap to reach a
 * binary choice. With only two languages the menu carries no information the
 * button cannot show by itself, so this is a single button that swaps the
 * language on activation.
 *
 * It renders the language it will switch *to*, not the current one — a control
 * whose label is its own outcome. The current language stays legible from the
 * interface itself (every string around it) and from the tooltip/aria-label,
 * which name both sides of the swap explicitly so the button is never
 * ambiguous to a screen reader.
 *
 * Keyboard support is inherent: it is a real `<button>`, so Enter/Space
 * activate it and it sits in the natural tab order.
 *
 * The i18n system is untouched — this still calls the same `setLanguage` from
 * LanguageContext that the dropdown used, so persistence and the `<html lang>`
 * side effects keep working.
 */
export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, setLanguage } = useLanguage();

  const next = language === "es" ? "en" : "es";
  const nextCode = next === "es" ? t("common:labels.esCode") : t("common:labels.enCode");
  const nextName = next === "es" ? t("navigation:languageSelector.es") : t("navigation:languageSelector.en");
  const switchLabel = t("navigation:languageSelector.switchTo", { language: nextName });

  return (
    <Tooltip content={switchLabel}>
      <button
        type="button"
        onClick={() => setLanguage(next)}
        aria-label={switchLabel}
        className="inline-flex items-center gap-2 rounded-base border border-default px-2.5 py-1.5 text-xs font-semibold text-heading outline-none transition-colors hover:bg-neutral-tertiary hover:text-fg-brand focus-visible:ring-4 focus-visible:ring-brand-soft"
      >
        <AppIcon name="language" size={16} />
        <span>{nextCode}</span>
        {compact ? null : <span className="hidden sm:inline">{nextName}</span>}
      </button>
    </Tooltip>
  );
}
