import { Alert, Badge, Card, Progress } from "flowbite-react";
import type { ReadinessDto } from "../../types/api";

const SOURCE_LABELS: Record<string, string> = {
  "canonical data": "Client information",
  "processed document": "Document review",
  "human review": "Decision review",
};

export function ReadinessPanel({ readiness }: { readiness: ReadinessDto }) {
  const isReady = readiness.score === 100 && readiness.open_conflicts === 0;

  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Badge color={isReady ? "success" : "info"} className="mb-3 w-fit">
            Review readiness
          </Badge>
          <h2 className="text-xl font-semibold text-gray-900">Matter completion overview</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Readiness combines required client information, analyzed documents, and recorded
            review decisions into one transparent status.
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 px-5 py-4 text-right">
          <span data-testid="readiness-score" className="block text-3xl font-semibold text-gray-900">
            {readiness.score}%
          </span>
          <span className="text-xs font-medium text-gray-500">
            {readiness.complete_items}/{readiness.total_items} requirements complete
          </span>
        </div>
      </div>

      <Progress
        progress={readiness.score}
        color={readiness.open_conflicts ? "yellow" : "green"}
        size="lg"
      />

      {isReady ? (
        <Alert color="success">
          This matter has the required information, documents, and review decisions for
          professional review.
        </Alert>
      ) : readiness.open_conflicts ? (
        <Alert color="warning">
          {readiness.open_conflicts} review item{readiness.open_conflicts === 1 ? "" : "s"}{" "}
          must be resolved before this matter can be marked ready.
        </Alert>
      ) : (
        <Alert color="info">
          Complete the pending requirements below to continue preparing this matter.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {readiness.items.map((item) => (
          <div
            key={item.key}
            className="flex min-h-24 flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div>
              <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
              <span className="mt-1 block text-xs text-gray-500">
                {SOURCE_LABELS[item.source] ?? item.source}
              </span>
            </div>
            <Badge color={item.complete ? "success" : "gray"} className="w-fit">
              {item.complete ? "Complete" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
