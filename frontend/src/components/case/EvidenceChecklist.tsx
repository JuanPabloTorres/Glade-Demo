import { Progress } from "flowbite-react";
import { useTranslation } from "react-i18next";
import type { EvidenceRequirement } from "../../types/bankruptcy";
import { AppIcon } from "../atoms/AppIcon";

interface EvidenceChecklistProps {
  requirements: EvidenceRequirement[];
  className?: string;
}

/**
 * The adaptive evidence checklist.
 *
 * Every line's tick comes from `EvidenceRequirement.satisfied`, decided once on
 * the server. Nothing here re-derives it: the workspace used to intersect the
 * requirement's words with the evidence type's translated label, which
 * disagreed with the server's own matching and stopped working entirely once
 * the requirements were translated.
 *
 * Laid out as a two-column list from `sm` up rather than a single stacked
 * column. Twelve full-width rows with 12px of padding each were most of the
 * documents screen's height, and the list is scanned — "which of these do I
 * still owe?" — not read line by line.
 */
export function EvidenceChecklist({ requirements, className = "" }: EvidenceChecklistProps) {
  const { t } = useTranslation("workspace");
  const satisfied = requirements.filter((item) => item.satisfied).length;
  const percent = requirements.length ? Math.round((satisfied / requirements.length) * 100) : 0;

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-body">
          {t("caseWorkspace.evidenceChecklistProgress", {
            satisfied,
            total: requirements.length,
          })}
        </p>
        <span className="text-sm font-semibold text-heading">{percent}%</span>
      </div>
      <Progress progress={percent} color="indigo" size="sm" />

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {requirements.map((requirement) => (
          <li
            key={requirement.key}
            className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm leading-5 ${
              requirement.satisfied ? "bg-neutral-secondary-soft" : ""
            }`}
          >
            {/* The glyph carries the state visually and the label carries it in
                text, so the tick never depends on color alone. */}
            <AppIcon
              name={requirement.satisfied ? "check" : "document"}
              size={16}
              className={`mt-0.5 shrink-0 ${requirement.satisfied ? "text-fg-success" : "text-body"}`}
            />
            <span className={requirement.satisfied ? "text-body line-through decoration-1" : "text-heading"}>
              {requirement.label}
            </span>
            <span className="sr-only">
              {requirement.satisfied
                ? t("caseWorkspace.evidenceChecklistReceived")
                : t("caseWorkspace.evidenceChecklistPending")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
