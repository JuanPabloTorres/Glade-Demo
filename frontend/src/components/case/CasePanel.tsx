import { Card } from "flowbite-react";
import type { ReactNode } from "react";
import type { AppIconName } from "../atoms/AppIcon";
import { AppIcon } from "../atoms/AppIcon";
import { CardTitle, HelperText } from "../atoms/Typography";

interface CasePanelProps {
  title: string;
  description?: string;
  icon?: AppIconName;
  /** Controls, counts or badges aligned with the title. */
  action?: ReactNode;
  children: ReactNode;
  /** `alert` tints the surface for warnings; `plain` drops the border and shadow. */
  tone?: "default" | "alert" | "plain";
  className?: string;
}

/**
 * `justify-start` is not decoration.
 *
 * flowbite-react's `Card` body is `flex flex-col justify-center`, and these
 * panels sit in equal-height grid rows — so the shorter panel's heading floated
 * to the middle of its card with a band of empty space above it. Every panel
 * starts at the top; the row's height is the taller one's business.
 */
const TONE_CLASS: Record<NonNullable<CasePanelProps["tone"]>, string> = {
  default: "app-card [&>div]:justify-start",
  alert: "app-card border-warning-subtle bg-warning-soft [&>div]:justify-start",
  plain: "app-card shadow-none [&>div]:justify-start",
};

/**
 * A titled section of a case screen.
 *
 * Every panel across the workspace and both dashboards was previously a
 * `<Card>` with its own hand-written `border border-[var(--color-border)]
 * bg-white shadow-sm`, its own heading size and its own spacing — a dozen
 * near-copies that had already drifted (`text-lg` here, `text-xl` there,
 * `shadow-sm` on some and `shadow-none` on others). This is the one shape, so
 * the pages compose sections instead of restating what a section looks like.
 *
 * The header row collapses to nothing when there is no title action, so a panel
 * with just a heading costs no more vertical space than the heading did.
 */
export function CasePanel({
  title,
  description,
  icon,
  action,
  children,
  tone = "default",
  className = "",
}: CasePanelProps) {
  return (
    <Card className={`${TONE_CLASS[tone]} min-w-0 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                // A warning panel's tile must not wear the brand colour: the
                // tint is the only thing distinguishing it at a glance.
                tone === "alert" ? "bg-warning-subtle text-fg-warning" : "icon-tile"
              }`}
            >
              <AppIcon name={icon} size={18} />
            </span>
          ) : null}
          <CardTitle className="min-w-0">{title}</CardTitle>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? <HelperText className="mt-1.5">{description}</HelperText> : null}
      <div className="mt-3 min-w-0">{children}</div>
    </Card>
  );
}
