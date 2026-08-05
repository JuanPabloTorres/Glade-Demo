import { Button, Card, Progress } from "flowbite-react";
import { Link } from "react-router";
import type { MatterSummaryDto } from "../../types/api";
import { StatusBadge } from "../atoms/StatusBadge";

export function MatterCard({ matter }: { matter: MatterSummaryDto }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {matter.display_name}
          </h2>
          <p className="text-sm capitalize text-gray-500">{matter.case_type} matter</p>
        </div>
        <StatusBadge value={matter.status} />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-sm">
          <span>Readiness</span>
          <span>{matter.readiness_score}%</span>
        </div>
        <Progress
          progress={matter.readiness_score}
          color={matter.open_conflicts ? "yellow" : "green"}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{matter.open_conflicts} open conflict(s)</span>
        <Button as={Link} to={`/matters/${matter.id}`} size="sm">
          Open workspace
        </Button>
      </div>
    </Card>
  );
}
