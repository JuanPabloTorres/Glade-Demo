import { Badge } from "flowbite-react";
import { useTranslation } from "react-i18next";
import type { EvidenceItem, EvidenceStatus } from "../../types/bankruptcy";
import { AppIcon } from "../atoms/AppIcon";
import { AppButton } from "../ui/AppButton";

interface EvidenceInventoryProps {
  items: EvidenceItem[];
  onRemove?: (evidenceId: string) => void;
  className?: string;
}

const STATUS_COLOR: Record<EvidenceStatus, string> = {
  reviewed: "success",
  received: "info",
  requested: "warning",
  missing: "gray",
};

/**
 * The documents actually attached to the case.
 *
 * The empty state is a line of text, not an empty bordered card. The documents
 * stage renders this beside the checklist, and a client who has uploaded
 * nothing was met with a tall blank panel taking half the screen and saying
 * nothing — the checklist beside it is what tells them what to do next.
 */
export function EvidenceInventory({ items, onRemove, className = "" }: EvidenceInventoryProps) {
  const { t } = useTranslation(["workspace", "common"]);

  if (!items.length) {
    return (
      <p className={`text-sm leading-6 text-body ${className}`}>
        {t("workspace:caseWorkspace.empty.documents")}
      </p>
    );
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-default px-3 py-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-secondary-soft">
            <AppIcon name="evidence" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-heading">
              {item.name || t("workspace:entryModal.pendingFileName")}
            </p>
            <p className="truncate text-xs text-body">
              {t(`workspace:entryModal.evidenceTypes.${item.evidenceType}`)}
            </p>
          </div>
          <Badge color={STATUS_COLOR[item.status]}>
            {t(`workspace:entryModal.evidenceStatus.${item.status}`)}
          </Badge>
          {onRemove ? (
            <AppButton size="xs" color="light" onClick={() => onRemove(item.id)}>
              {t("common:actions.delete")}
            </AppButton>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
