import { Badge } from "flowbite-react";
import type { ActivityDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";

const EVENT_LABELS: Record<string, string> = {
  matter_created: "Matter created",
  intake_updated: "Client information updated",
  document_processed: "Document analyzed",
  conflict_detected: "Review item identified",
  conflict_resolved: "Decision recorded",
  document_review_completed: "Document review completed",
  matter_status_changed: "Matter status updated",
};

function formatActivityMessage(message: string): string {
  return message
    .replaceAll("Canonical intake", "Client information")
    .replaceAll("canonical intake", "client information")
    .replaceAll("canonical record", "client record")
    .replaceAll("canonical review item", "review item")
    .replaceAll("Conflict", "Review item")
    .replaceAll("conflict", "review item")
    .replaceAll("Document processed", "Document analyzed");
}

export function ActivityTimeline({ activities }: { activities: ActivityDto[] }) {
  if (!activities.length) {
    return <EmptyState message="No decisions or workflow updates have been recorded yet." />;
  }

  return (
    <ol className="relative border-s border-gray-200">
      {activities.map((activity) => (
        <li key={activity.id} className="mb-6 ms-5 last:mb-0">
          <div className="absolute -start-1.5 mt-2 h-3 w-3 rounded-full border border-white bg-blue-600" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">
              {EVENT_LABELS[activity.event_type] ?? activity.event_type.replaceAll("_", " ")}
            </Badge>
            <time className="text-xs text-gray-500">
              {new Date(activity.created_at).toLocaleString()}
            </time>
          </div>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            {formatActivityMessage(activity.message)}
          </p>
        </li>
      ))}
    </ol>
  );
}
