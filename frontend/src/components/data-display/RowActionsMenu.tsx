import { Dropdown, DropdownItem, Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";

export interface RowActionItem {
  label: string;
  onClick: () => void;
}

interface RowActionsMenuProps {
  viewLabel?: string;
  onView: () => void;
  actions: RowActionItem[];
}

export function RowActionsMenu({ viewLabel, onView, actions }: RowActionsMenuProps) {
  const { t } = useTranslation("common");
  const resolvedViewLabel = viewLabel ?? t("actions.view");

  return (
    <div className="flex items-center gap-2">
      <Tooltip content={resolvedViewLabel}>
        <AppButton
          onClick={onView}
          size="sm"
          className="primary-action inline-flex items-center rounded-lg px-3 py-1.5 text-sm"
          aria-label={resolvedViewLabel}
          iconLeft="search"
        >
          {resolvedViewLabel}
        </AppButton>
      </Tooltip>
      <Dropdown
        inline
        aria-label={t("actions.moreActions")}
        // Was `px-2 py-1 text-xs`, which rendered a 26px-tall trigger — below
        // the size a finger can hit reliably next to a full-height primary
        // button. Matched to the row's other control instead.
        label={<span className="inline-flex min-h-9 items-center rounded-base border border-default px-3 py-1.5 text-sm text-heading">{t("actions.moreActions")}</span>}
      >
        {actions.map((action) => (
          <DropdownItem key={action.label} onClick={action.onClick}>
            {action.label}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );
}
