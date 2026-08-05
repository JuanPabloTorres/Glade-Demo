import { Card, Progress } from "flowbite-react";
import type { ReadinessDto } from "../../types/api";

export function ReadinessPanel({ readiness }: { readiness: ReadinessDto }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Case readiness</h2>
          <p className="text-sm text-gray-500">
            Required canonical fields, processed documents, and human review.
          </p>
        </div>
        <div className="text-right">
          <span data-testid="readiness-score" className="block text-3xl font-semibold">{readiness.score}%</span>
          <span className="text-xs text-gray-500">
            {readiness.complete_items}/{readiness.total_items} complete
          </span>
        </div>
      </div>

      <Progress
        progress={readiness.score}
        color={readiness.open_conflicts ? "yellow" : "green"}
        size="lg"
      />

      {readiness.open_conflicts ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {readiness.open_conflicts} conflict(s) require an explicit decision before the
          matter can be ready for review.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {readiness.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm"
          >
            <div>
              <span className="block">{item.label}</span>
              <span className="text-xs text-gray-400">{item.source}</span>
            </div>
            <span className={item.complete ? "text-green-600" : "text-gray-400"}>
              {item.complete ? "Complete" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
