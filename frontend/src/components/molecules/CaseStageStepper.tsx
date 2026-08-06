import { Badge, Button, Progress } from "flowbite-react";

interface CaseStageStepperProps {
  stages: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function CaseStageStepper({ stages, currentIndex, onSelect }: CaseStageStepperProps) {
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-700">Flujo guiado</h2>
        <Badge color="indigo">Paso {currentIndex + 1} de {stages.length}</Badge>
      </div>
      <Progress progress={progress} color="indigo" size="sm" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {stages.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <Button
              key={stage}
              size="xs"
              color={isCurrent ? "indigo" : "light"}
              className="shrink-0"
              onClick={() => onSelect(index)}
            >
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px] font-semibold text-slate-700">
                {isCompleted ? "✓" : index + 1}
              </span>
              {stage}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
