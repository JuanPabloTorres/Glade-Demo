import {
  Badge,
  Timeline,
  TimelineBody,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import type { TimelineEvent } from "../../types/bankruptcy";

export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Timeline>
      {events.map((event) => (
        <TimelineItem key={event.id}>
          <TimelinePoint />
          <TimelineContent>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <TimelineTime>{new Date(event.createdAt).toLocaleDateString("es-PR")}</TimelineTime>
              <Badge color={event.status === "complete" ? "success" : event.status === "current" ? "warning" : "gray"}>
                {event.status === "complete" ? "Completado" : event.status === "current" ? "Actual" : "Próximo"}
              </Badge>
            </div>
            <TimelineTitle>{event.title}</TimelineTitle>
            <TimelineBody>{event.description}</TimelineBody>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
