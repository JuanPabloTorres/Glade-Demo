import { Alert, Badge, Button, Card } from "flowbite-react";
import type { ConflictDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";
import { StatusBadge } from "../atoms/StatusBadge";

interface ConflictListProps {
  conflicts: ConflictDto[];
  busy: boolean;
  onResolve: (id: string, value: string) => Promise<void>;
}

export function ConflictList({ conflicts, busy, onResolve }: ConflictListProps) {
  if (!conflicts.length) {
    return (
      <EmptyState message="No review items were identified. Document values currently align with the client record." />
    );
  }

  const ordered = [...conflicts].sort((left, right) => {
    if (left.status === right.status) return 0;
    return left.status === "open" ? -1 : 1;
  });

  const resolve = (id: string, value: string) => {
    void onResolve(id, value).catch(() => undefined);
  };

  return (
    <div className="space-y-4">
      {ordered.map((conflict) => (
        <Card
          key={conflict.id}
          data-testid={`conflict-${conflict.field_name}`}
          className="border border-gray-200 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge color="gray" className="mb-2 w-fit">
                Extracted field
              </Badge>
              <h3 className="text-lg font-semibold capitalize text-gray-900">
                {conflict.field_name.replaceAll("_", " ")}
              </h3>
            </div>
            <StatusBadge value={conflict.status} />
          </div>

          {conflict.status === "resolved" ? (
            <Alert color="success">
              Decision recorded: <strong>{conflict.resolved_value}</strong>
            </Alert>
          ) : (
            <>
              <p className="text-sm leading-6 text-gray-600">
                MatterReady found different values. Select the value that should become the
                approved client record.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Client record
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {conflict.canonical_value || "No value recorded"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{conflict.canonical_source}</p>
                  {conflict.canonical_value ? (
                    <Button
                      size="xs"
                      className="mt-4"
                      disabled={busy}
                      onClick={() => resolve(conflict.id, conflict.canonical_value)}
                    >
                      Keep client record
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Document finding
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {conflict.conflicting_value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{conflict.conflicting_source}</p>
                  <Button
                    color="yellow"
                    size="xs"
                    className="mt-4"
                    disabled={busy}
                    onClick={() => resolve(conflict.id, conflict.conflicting_value)}
                  >
                    Accept document value
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
