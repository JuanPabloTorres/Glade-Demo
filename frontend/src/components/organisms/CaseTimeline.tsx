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
import { useTranslation } from "react-i18next";
import { formatDate } from "../../i18n/format";
import type { TimelineEvent } from "../../types/bankruptcy";

const STATUS_LABEL_KEY: Record<TimelineEvent["status"], string> = {
  complete: "timeline.statusComplete",
  current: "timeline.statusCurrent",
  upcoming: "timeline.statusUpcoming",
};

const STATUS_COLOR: Record<TimelineEvent["status"], string> = {
  complete: "success",
  current: "warning",
  upcoming: "gray",
};

/**
 * The case history.
 *
 * Every string here used to be hardcoded Spanish — the three status badges, and
 * the entry text itself, which the workspace generated in Spanish and froze into
 * `localStorage` at creation time. An English session read the whole timeline in
 * Spanish, and switching language afterwards changed nothing, because the text
 * was already persisted.
 *
 * Entries now carry locale keys and are translated here, at render, so the
 * language switch re-labels the history too. `title`/`description` remain the
 * fallback for events persisted by an earlier build and for text a person
 * actually typed — an attorney's status note is their words, and translating
 * them would be a mistranslation.
 */
export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  const { t } = useTranslation("workspace");

  return (
    <Timeline>
      {events.map((event) => {
        const statusKey = event.descriptionParams?.statusKey;
        return (
          <TimelineItem key={event.id}>
            <TimelinePoint />
            <TimelineContent>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {/* The date followed the timeline's own hardcoded "es-PR"; it now
                    follows the session, like every other date in the app. */}
                <TimelineTime>{formatDate(event.createdAt)}</TimelineTime>
                <Badge color={STATUS_COLOR[event.status]}>{t(STATUS_LABEL_KEY[event.status])}</Badge>
              </div>
              <TimelineTitle>{event.titleKey ? t(event.titleKey) : event.title}</TimelineTitle>
              <TimelineBody>
                {event.descriptionKey
                  ? t(event.descriptionKey, {
                      ...event.descriptionParams,
                      // Resolved here rather than stored translated, so a status
                      // recorded in one language reads correctly in the other.
                      ...(statusKey ? { status: t(`status.${statusKey}`) } : {}),
                    })
                  : event.description}
              </TimelineBody>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
