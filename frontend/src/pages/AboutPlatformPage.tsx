import { Badge, Card } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppAccordion, type AppAccordionItem } from "../components/molecules/AppAccordion";
import { APP_VERSION } from "../config/version";

/** Panel ids double as the footer's fragment targets (`/about#privacy`, …). */
const SECTION_IDS = ["privacy", "security", "accessibility", "terms", "help"] as const;

/** These two sections name the repo file a reviewer should open next. */
const SECTIONS_CITING_SECURITY_DOC = new Set<string>(["security", "help"]);

/**
 * Master instruction §13: technical/reviewer-facing detail lives here, not in
 * the client/attorney-facing footer. Linked from the footer and the header's
 * "Ayuda" entry for both roles.
 *
 * The disclosure list is the governed `AppAccordion` wrapper rather than a
 * page-local `Accordion` — same behavior, but the Flowbite visual language
 * now comes from one place instead of being re-specified per page.
 */
export function AboutPlatformPage() {
  const { t } = useTranslation(["workspace", "common"]);

  const items: AppAccordionItem[] = SECTION_IDS.map((id) => ({
    key: id,
    id,
    title: t(`workspace:about.sections.${id}.title`),
    content: (
      <p className="text-sm leading-6 text-body">
        {t(`workspace:about.sections.${id}.content`)}
        {SECTIONS_CITING_SECURITY_DOC.has(id) ? (
          <>
            <code className="mx-1 rounded bg-neutral-secondary-medium px-1.5 py-0.5">SECURITY.md</code>.
          </>
        ) : null}
      </p>
    ),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="app-card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-heading">{t("workspace:about.title")}</h1>
          <Badge color="indigo">v{APP_VERSION}</Badge>
          <Badge color="gray">{t("common:badges.demo")}</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-body">{t("workspace:about.description")}</p>
      </Card>

      <AppAccordion items={items} />
    </div>
  );
}
