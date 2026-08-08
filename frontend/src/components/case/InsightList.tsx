import { useTranslation } from "react-i18next";
import type { AppIconName } from "../atoms/AppIcon";
import { AppIcon } from "../atoms/AppIcon";

export type InsightTone = "neutral" | "warning" | "positive";

interface InsightListProps {
  items: string[];
  /** Rendered in place of the list when `items` is empty. */
  emptyMessage?: string;
  tone?: InsightTone;
  /** Overrides the tone's default glyph — e.g. a numbered step list. */
  icon?: AppIconName;
  /** Numbers the entries instead of showing a glyph. */
  ordered?: boolean;
  /**
   * Show only this many, with a "+N more" line. The overview stacks four of
   * these lists on one screen, and an unbounded list is what made that screen
   * scroll for a page and a half.
   */
  limit?: number;
  className?: string;
}

const TONE_ICON: Record<InsightTone, AppIconName> = {
  neutral: "check",
  warning: "alert",
  positive: "check",
};

const TONE_ICON_CLASS: Record<InsightTone, string> = {
  neutral: "text-body",
  warning: "text-fg-warning",
  positive: "text-fg-success",
};

/**
 * A list of generated guidance lines — discussion points, warnings, next
 * steps, missing items, chapter questions.
 *
 * These all used to be hand-rolled `<ul>`s inside the pages, five variants of
 * the same thing with five different bullet treatments and no shared empty
 * state. They are one component because they are one thing: short sentences
 * produced by the analysis, read rather than acted on.
 *
 * `limit` exists because the case overview shows four of these at once. The
 * page decides how much of each list is worth the space above the fold; the
 * component is what makes truncation honest rather than a silent `.slice(0, 3)`
 * that leaves no trace of what was dropped.
 */
export function InsightList({
  items,
  emptyMessage,
  tone = "neutral",
  icon,
  ordered = false,
  limit,
  className = "",
}: InsightListProps) {
  const { t } = useTranslation("workspace");

  if (!items.length) {
    return emptyMessage ? <p className="text-sm leading-6 text-body">{emptyMessage}</p> : null;
  }

  const shown = limit ? items.slice(0, limit) : items;
  const hidden = items.length - shown.length;
  const glyph = icon ?? TONE_ICON[tone];

  return (
    <div className={className}>
      <ul className="space-y-2">
        {shown.map((item, index) => (
          <li key={item} className="flex gap-2.5 text-sm leading-6 text-body">
            {ordered ? (
              <span
                aria-hidden="true"
                className="glade-gradient mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-white"
              >
                {index + 1}
              </span>
            ) : (
              <AppIcon name={glyph} size={16} className={`mt-1 shrink-0 ${TONE_ICON_CLASS[tone]}`} />
            )}
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-2 text-xs text-body">{t("insights.moreItems", { count: hidden })}</p>
      ) : null}
    </div>
  );
}
