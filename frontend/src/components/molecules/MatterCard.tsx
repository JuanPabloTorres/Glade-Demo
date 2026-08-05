import { Badge, Button, Card, Progress } from "flowbite-react";
import { Link } from "react-router";
import type { MatterSummaryDto } from "../../types/api";
import { AppIcon } from "../atoms/AppIcon";
import { StatusBadge } from "../atoms/StatusBadge";

export function MatterCard({ matter }: { matter: MatterSummaryDto }) {
  const reviewLabel = matter.open_conflicts
    ? `${matter.open_conflicts} item${matter.open_conflicts === 1 ? "" : "s"} to review`
    : "No review items";

  return (
    <Card className="border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
            <AppIcon name="portfolio" size={21} />
          </span>
          <div className="space-y-2">
            <Badge color="gray" className="w-fit capitalize">
              {matter.case_type}
            </Badge>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                {matter.display_name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Assigned to {matter.assigned_to ?? "the intake team"}
              </p>
            </div>
          </div>
        </div>
        <StatusBadge value={matter.status} />
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <div className="mb-2.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Review readiness</span>
          <span className="font-semibold text-slate-950">{matter.readiness_score}%</span>
        </div>
        <Progress
          progress={matter.readiness_score}
          color={matter.open_conflicts ? "yellow" : "green"}
          size="lg"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className={matter.open_conflicts ? "flex items-center gap-2 text-sm font-medium text-amber-700" : "flex items-center gap-2 text-sm text-slate-500"}>
          <AppIcon name={matter.open_conflicts ? "clock" : "check"} size={16} />
          {reviewLabel}
        </span>
        <Button as={Link} to={`/matters/${matter.id}`} size="sm">
          <span className="flex items-center gap-2">
            Open workspace
            <AppIcon name="arrow-right" size={16} />
          </span>
        </Button>
      </div>
    </Card>
  );
}
