import { Badge, Button, Card, Progress } from "flowbite-react";
import { Link } from "react-router";
import type { MatterSummaryDto } from "../../types/api";
import { StatusBadge } from "../atoms/StatusBadge";

export function MatterCard({ matter }: { matter: MatterSummaryDto }) {
  const reviewLabel = matter.open_conflicts
    ? `${matter.open_conflicts} item${matter.open_conflicts === 1 ? "" : "s"} to review`
    : "No review items";

  return (
    <Card className="border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge color="gray" className="w-fit capitalize">
            {matter.case_type}
          </Badge>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {matter.display_name}
            </h2>
            <p className="text-sm text-gray-500">
              Assigned to {matter.assigned_to ?? "the intake team"}
            </p>
          </div>
        </div>
        <StatusBadge value={matter.status} />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-gray-700">Review readiness</span>
          <span className="font-semibold text-gray-900">{matter.readiness_score}%</span>
        </div>
        <Progress
          progress={matter.readiness_score}
          color={matter.open_conflicts ? "yellow" : "green"}
          size="lg"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <span className={matter.open_conflicts ? "text-sm font-medium text-amber-700" : "text-sm text-gray-500"}>
          {reviewLabel}
        </span>
        <Button as={Link} to={`/matters/${matter.id}`} size="sm">
          Review matter
        </Button>
      </div>
    </Card>
  );
}
