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
      <Dropdown
        inline
        label={
          <span
            aria-label={t("common:a11y.switchLanguage")}
            className="inline-flex items-center gap-2 rounded-md border border-(--color-border) px-2.5 py-1 text-xs font-semibold text-(--color-text)"
          >
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
