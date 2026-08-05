import type { ActivityDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";

export function ActivityTimeline({ activities }: { activities: ActivityDto[] }) {
  if (!activities.length) {
    return <EmptyState message="No activity recorded." />;
  }

  return (
    <ol className="relative border-s border-gray-200">
      {activities.map((activity) => (
        <li key={activity.id} className="mb-6 ms-4">
          <div className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-400" />
          <time className="text-xs text-gray-500">
            {new Date(activity.created_at).toLocaleString()}
          </time>
          <h3 className="font-medium capitalize">
            {activity.event_type.replaceAll("_", " ")}
          </h3>
          <p className="text-sm text-gray-600">{activity.message}</p>
        </li>
      ))}
    </ol>
  );
}
