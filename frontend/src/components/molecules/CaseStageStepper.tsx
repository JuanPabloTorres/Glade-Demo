import { Badge } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";

interface CaseStageStepperProps {
  stages: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Single source of truth for stage navigation in the case workspace.
 *
 * This used to be a secondary "pill row" rendered directly above Flowbite's
 * `Tabs`/`TabItem` strip in CaseWorkspacePage — two separate controls for
 * one navigation concept, both driven through the same `activeStage` state,
 * which is exactly what `.claude/rules/frontend/feature-architecture.md`
 * prohibits ("Navegación de etapas tiene una sola fuente de verdad
 * controlada; no mezcles ref imperativo y estado"). See
 * docs/ux/UX-SHELL-POLISH-AUDIT-2026-08-06.md section "b. Stepper" for the
 * full audit. `Tabs` has been removed from CaseWorkspacePage entirely — this
 * is now the ONLY rendered stage-navigation control, and stage content
 * renders conditionally on `activeStage` instead of inside `TabItem`s.
 *
 * `flowbite-react@0.12.9` ships no `Stepper` component (verified against the
 * full component list under `node_modules/flowbite-react/dist/components/`),
 * so this is hand-built using Flowbite's visual language: a numbered circle
 * per step (brand-gradient fill + check icon once completed, brand-gradient
 * fill with a focus-style ring for the current step, outline/muted for
 * upcoming steps — the same active-state contrast convention already
 * established in `SidebarItem.tsx`) connected by a plain CSS line, no extra
 * library.
 */
export function CaseStageStepper({ stages, currentIndex, onSelect }: CaseStageStepperProps) {
  const { t } = useTranslation("workspace");

  return (
    <section className="rounded-xl border border-(--color-border) bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-label text-indigo-700">{t("workspace:stageStepper.title")}</h2>
        <Badge color="indigo">
          {t("workspace:stageStepper.stepOf", { current: currentIndex + 1, total: stages.length })}
        </Badge>
      </div>
      <nav aria-label={t("workspace:stageStepper.title")}>
        <ol className="flex items-center overflow-x-auto pb-1">
          {stages.map((stage, index) => {
            const isCurrent = index === currentIndex;
            const isCompleted = index < currentIndex;
            const stepLabel = `${t("workspace:stageStepper.stepOf", { current: index + 1, total: stages.length })} — ${stage}`;
            return (
              <li key={stage} className="flex items-center">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`h-0.5 w-6 shrink-0 sm:w-10 ${
                      index <= currentIndex ? "bg-indigo-600" : "bg-(--color-border)"
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={stepLabel}
                  onClick={() => onSelect(index)}
                  className="group flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "glade-gradient text-white"
                        : isCurrent
                          ? "glade-gradient text-white ring-4 ring-indigo-100"
                          : "border-2 border-(--color-border) bg-white text-(--color-text-muted) group-hover:border-indigo-300 group-hover:text-indigo-600"
                    }`}
                  >
                    {isCompleted ? <AppIcon name="check" size={16} className="text-white" /> : index + 1}
                  </span>
                  <span
                    className={`max-w-20 truncate text-center text-xs font-medium ${
                      isCurrent
                        ? "text-indigo-700"
                        : isCompleted
                          ? "text-(--color-text)"
                          : "text-(--color-text-muted)"
                    }`}
                  >
                    {stage}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
}
