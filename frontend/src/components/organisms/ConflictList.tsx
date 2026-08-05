import { Button, Card } from "flowbite-react";
import type { ConflictDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";
import { StatusBadge } from "../atoms/StatusBadge";

interface ConflictListProps {
  conflicts: ConflictDto[];
  busy: boolean;
  onResolve: (id: string, value: string) => void;
}

export function ConflictList({ conflicts, busy, onResolve }: ConflictListProps) {
  if (!conflicts.length) {
    return <EmptyState message="No data conflicts detected." />;
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <Card key={conflict.id}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold capitalize">
              {conflict.field_name.replaceAll("_", " ")}
            </h3>
            <StatusBadge value={conflict.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium uppercase text-green-700">
                {conflict.canonical_source}
              </p>
              <p>{conflict.canonical_value}</p>
              {conflict.status === "open" ? (
                <Button
                  size="xs"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => onResolve(conflict.id, conflict.canonical_value)}
                >
                  Keep intake value
                </Button>
              ) : null}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium uppercase text-amber-700">
                {conflict.conflicting_source}
              </p>
              <p>{conflict.conflicting_value}</p>
              {conflict.status === "open" ? (
                <Button
                  color="yellow"
                  size="xs"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => onResolve(conflict.id, conflict.conflicting_value)}
                >
                  Use document value
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
