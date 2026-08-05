import { Button, Card } from "flowbite-react";
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
    return <EmptyState message="No data conflicts detected." />;
  }

  const ordered = [...conflicts].sort((left, right) => {
    if (left.status === right.status) return 0;
    return left.status === "open" ? -1 : 1;
  });

  const resolve = (id: string, value: string) => {
    void onResolve(id, value).catch(() => undefined);
  };

  return (
    <div className="space-y-3">
      {ordered.map((conflict) => (
        <Card key={conflict.id} data-testid={`conflict-${conflict.field_name}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold capitalize">
              {conflict.field_name.replaceAll("_", " ")}
            </h3>
            <StatusBadge value={conflict.status} />
          </div>

          {conflict.status === "resolved" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Accepted value: <strong>{conflict.resolved_value}</strong>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-medium uppercase text-green-700">
                  {conflict.canonical_source}
                </p>
                <p>{conflict.canonical_value || "No canonical value provided"}</p>
                {conflict.canonical_value ? (
                  <Button
                    size="xs"
                    className="mt-3"
                    disabled={busy}
                    onClick={() => resolve(conflict.id, conflict.canonical_value)}
                  >
                    Keep canonical value
                  </Button>
                ) : null}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium uppercase text-amber-700">
                  {conflict.conflicting_source}
                </p>
                <p>{conflict.conflicting_value}</p>
                <Button
                  color="yellow"
                  size="xs"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => resolve(conflict.id, conflict.conflicting_value)}
                >
                  Use document value
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
