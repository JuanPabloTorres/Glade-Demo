import { Badge } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";
import { AppButton } from "../ui/AppButton";

interface StageOrientationProps {
  title: string;
  description: string;
  estimatedMinutes: number;
  percentComplete: number;
  missingItems?: string[];
  example?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onOpenChat?: () => void;
}

/**
 * Per-stage orientation block, master instruction §14.3: título, explicación,
 * tiempo estimado, porcentaje, faltantes, botón principal, acceso al chat,
 * ejemplo. Rendered at the top of every data-entry stage in the client
 * workspace (Block 4).
 */
export function StageOrientation({
  title,
  description,
  estimatedMinutes,
  percentComplete,
  missingItems = [],
  example,
  primaryActionLabel,
  onPrimaryAction,
  onOpenChat,
}: StageOrientationProps) {
  const { t } = useTranslation("workspace");
  return (
    <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-card-title text-[var(--color-text)]">{title}</h2>
          <p className="mt-1 max-w-2xl text-supporting text-[var(--color-text-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge color="gray">{t("workspace:stages.estimatedMinutesLabel", { minutes: estimatedMinutes })}</Badge>
          <Badge color={percentComplete >= 100 ? "success" : "indigo"}>{t("workspace:stages.percentCompleteLabel", { percent: percentComplete })}</Badge>
        </div>
      </div>

      {missingItems.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {missingItems.map((item) => (
            <span key={item} className="text-caption flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium text-fg-warning ring-1 ring-inset ring-warning-subtle">
              <AppIcon name="alert" size={13} /> {item}
            </span>
          ))}
        </div>
      ) : null}

      {example ? <p className="text-caption mt-3 text-[var(--color-text-muted)]"><span className="font-semibold">{t("workspace:stages.exampleLabel")}</span> {example}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {primaryActionLabel && onPrimaryAction ? (
          <AppButton size="sm" className="primary-action" onClick={onPrimaryAction}>{primaryActionLabel}</AppButton>
        ) : null}
        {onOpenChat ? (
          <AppButton size="sm" color="light" iconLeft="chat" onClick={onOpenChat}>
            {t("workspace:stages.askAssistant")}
          </AppButton>
        ) : null}
      </div>
    </div>
  );
}
