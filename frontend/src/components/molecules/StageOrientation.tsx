import { Badge, Button } from "flowbite-react";
import { AppIcon } from "../atoms/AppIcon";

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
  return (
    <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge color="gray">~{estimatedMinutes} min</Badge>
          <Badge color={percentComplete >= 100 ? "success" : "indigo"}>{percentComplete}% completo</Badge>
        </div>
      </div>

      {missingItems.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {missingItems.map((item) => (
            <span key={item} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-warning)] ring-1 ring-inset ring-amber-200">
              <AppIcon name="alert" size={13} /> {item}
            </span>
          ))}
        </div>
      ) : null}

      {example ? <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]"><span className="font-semibold">Ejemplo:</span> {example}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {primaryActionLabel && onPrimaryAction ? (
          <Button size="sm" className="primary-action" onClick={onPrimaryAction}>{primaryActionLabel}</Button>
        ) : null}
        {onOpenChat ? (
          <Button size="sm" color="light" onClick={onOpenChat}>
            <AppIcon name="chat" size={16} className="mr-2" /> Preguntar al asistente
          </Button>
        ) : null}
      </div>
    </div>
  );
}
