import { Card, Progress } from "flowbite-react";
import type { ReadinessDto } from "../../types/api";

export function ReadinessPanel({ readiness }: { readiness: ReadinessDto }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Case readiness</h2>
          <p className="text-sm text-gray-500">
            Derived from required intake fields, documents, and conflicts.
          </p>
        </div>
        <span className="text-3xl font-semibold">{readiness.score}%</span>
      </div>

      <Progress
        progress={readiness.score}
        color={readiness.open_conflicts ? "yellow" : "green"}
        size="lg"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {readiness.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
          >
            <span>{item.label}</span>
            <span className={item.complete ? "text-green-600" : "text-gray-400"}>
              {item.complete ? "Complete" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
