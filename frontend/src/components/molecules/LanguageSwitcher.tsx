import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/LanguageContext";
import { AppIcon } from "../atoms/AppIcon";

/**
 * Where the control sits, which decides its colours — not a second design.
 *
 * `surface` is the default: the control sits on one of the app's light
 * surfaces (the header, a card) and uses the normal text tokens.
 *
 * `onDark` is for the unauthenticated hero, whose background is a photograph
 * under a near-black gradient. The tokens are the same palette read for a dark
 * ground; the type scale, icon, radius, spacing, focus ring and behaviour are
 * untouched.
 */
export type LanguageSwitcherTone = "surface" | "onDark";

interface LanguageSwitcherProps {
  /** Hides the spelled-out language name, keeping only the two-letter code. */
  compact?: boolean;
  tone?: LanguageSwitcherTone;
  className?: string;
}

const TONE: Record<LanguageSwitcherTone, string> = {
  surface: "border-default text-heading hover:bg-neutral-tertiary hover:text-fg-brand focus-visible:ring-brand-soft",
  // `text-white` is the fix for the reported "texto negro" on the login
  // screen: this control previously rendered `text-heading` (#0f172a) with a
  // transparent background, so on the dark hero it was near-black on
  // near-black. It was legible in the header only because the header happens
  // to be white — the same component, the same classes, one readable context
  // and one unreadable one.
  onDark: "border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:ring-white/40",
};

/**
 * The product's only language control.
 *
 * One component, used by the header and the login hero, so the two cannot
 * drift into different designs. The difference between them is a `tone`, not a
 * second implementation — which is what stops a "LoginLanguageButton" and a
 * "HeaderLanguageButton" from reappearing.
 *
 * Direct EN <-> ES toggle rather than a dropdown: with two languages a menu
 * carries no information the button cannot show by itself, and costs an extra
 * interaction plus a focus trap to reach a binary choice.
 *
 * It shows the language it will switch *to*, so the label is the outcome of
 * pressing it. That is the ambiguous part of any language toggle, so the
 * ambiguity is resolved in text rather than left to convention: the accessible
 * name and the `title` both spell out "Switch to English" / "Cambiar a
 * Español", naming the destination language explicitly.
 *
 * A real `<button>`, so Enter/Space activate it and it sits in the natural tab
 * order. `setLanguage` from LanguageContext persists the choice, and that
 * choice now outranks the signed-in profile's language on later loads — see
 * LanguageContext for why it previously did not.
 */
export function LanguageSwitcher({ compact = false, tone = "surface", className = "" }: LanguageSwitcherProps) {
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
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-base border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-4 ${TONE[tone]} ${className}`}
    >
      <AppIcon name="language" size={16} />
      <span>{nextCode}</span>
      {compact ? null : <span className="hidden sm:inline">{nextName}</span>}
    </button>
  );
}
