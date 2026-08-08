import { useTranslation } from "react-i18next";
import type { CaseAnalysis } from "../../types/bankruptcy";
import { AppAccordion } from "../molecules/AppAccordion";
import { CardTitle, HelperText } from "../atoms/Typography";
import { InsightList } from "./InsightList";

interface AttorneyDiscussionPanelProps {
  analysis: CaseAnalysis | null;
  className?: string;
}

/**
 * What to raise with the attorney: the discussion points, then the Chapter 7
 * and Chapter 13 questions.
 *
 * All three used to render as three always-open stacked cards — roughly
 * fourteen bullet lines that pushed the case's actual figures off the first
 * screen. The chapters are a disclosure now: they are reference material for a
 * conversation that has not happened yet, not something the client acts on
 * while filling the file in. The discussion points stay open because they are
 * the shortest list and the one the client is meant to bring with them.
 *
 * The disclaimer sits above the chapters rather than under them. It qualifies
 * what the questions are — preparation, not a recommendation — and a caveat
 * that only appears after the reader has already read the list is one they have
 * already formed an impression without.
 */
export function AttorneyDiscussionPanel({ analysis, className = "" }: AttorneyDiscussionPanelProps) {
  const { t } = useTranslation("workspace");

  const chapter7 = analysis?.chapter_7_questions ?? [];
  const chapter13 = analysis?.chapter_13_questions ?? [];

  return (
    <div className={`space-y-4 ${className}`}>
      <section>
        <CardTitle>{t("caseWorkspace.discussionPointsTitle")}</CardTitle>
        <InsightList
          className="mt-3"
          items={analysis?.discussion_points ?? []}
          emptyMessage={t("caseWorkspace.discussionPointsEmpty")}
        />
      </section>

      {chapter7.length || chapter13.length ? (
        <section>
          <CardTitle>{t("caseWorkspace.chapterComparisonTitle")}</CardTitle>
          <HelperText className="mt-1">{t("caseWorkspace.chapterComparisonDescription")}</HelperText>
          <AppAccordion
            className="mt-3"
            items={[
              {
                key: "chapter-7",
                title: t("caseWorkspace.chapter7"),
                content: <InsightList items={chapter7} icon="help" />,
              },
              {
                key: "chapter-13",
                title: t("caseWorkspace.chapter13"),
                content: <InsightList items={chapter13} icon="help" />,
              },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}
