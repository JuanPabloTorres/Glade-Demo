import { Dropdown, DropdownItem, Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";
import { useLanguage } from "../../i18n/LanguageContext";

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { t } = useTranslation(["navigation", "common"]);
  const { language, setLanguage } = useLanguage();

  const currentLabel = language === "es" ? t("navigation:languageSelector.es") : t("navigation:languageSelector.en");
  const currentCode = language === "es" ? t("common:labels.esCode") : t("common:labels.enCode");

  return (
    <Tooltip content={t("navigation:languageSelector.tooltip")}>
      {/* aria-label goes on the Dropdown (which renders the real <button>), not
          on the inner <span> it used to sit on: an aria-label on a plain span
          contributes nothing to the button's accessible name, so the control
          announced as just "ES" — verified in-browser before this change. */}
      <Dropdown
        inline
        aria-label={t("common:a11y.switchLanguage")}
        label={
          <span className="inline-flex items-center gap-2 rounded-base border border-default px-2.5 py-1 text-xs font-semibold text-heading">
            <AppIcon name="language" size={16} />
            <span>{currentCode}</span>
            {!compact ? <span className="hidden sm:inline">{currentLabel}</span> : null}
          </span>
        }
      >
        <DropdownItem onClick={() => setLanguage("es")}>ES - {t("navigation:languageSelector.es")}</DropdownItem>
        <DropdownItem onClick={() => setLanguage("en")}>EN - {t("navigation:languageSelector.en")}</DropdownItem>
      </Dropdown>
    </Tooltip>
  );
}
