import { useTranslation } from "react-i18next";
import { AppAccordion, type AppAccordionItem } from "../components/molecules/AppAccordion";
import { PageTitle } from "../components/atoms/PageTitle";
import { BodyText, SectionTitle } from "../components/atoms/Typography";

/**
 * Which help sections exist and how many question/answer pairs each carries.
 * Declared as data so the page renders from the locale files instead of
 * repeating markup per section — adding a question is a locale change plus a
 * number here, never new JSX.
 */
const HELP_SECTIONS = [
  { key: "gettingStarted", questions: 3 },
  { key: "documents", questions: 3 },
  { key: "tasks", questions: 3 },
  { key: "activities", questions: 2 },
  { key: "assistant", questions: 3 },
  { key: "account", questions: 3 },
  { key: "faq", questions: 4 },
] as const;

/**
 * Help center. Replaces the previous arrangement where "Ayuda" pointed at the
 * platform/legal page (`/about`), mixing "how do I use this product" with
 * privacy and terms — two different questions for two different moments.
 * `/about` keeps the legal and reviewer-facing detail; this page answers how
 * the product works.
 *
 * Every section is a disclosure list built from the governed `AppAccordion`,
 * so the open/closed behaviour, the chevron, the keyboard handling and the
 * `aria-expanded`/`aria-controls` wiring come from one place. Sections start
 * collapsed: seven expanded blocks would be the wall of text this page exists
 * to avoid, and `max-w-3xl` keeps the answers at a readable measure on a wide
 * desktop instead of stretching them across the viewport.
 */
export function HelpPage() {
  const { t } = useTranslation(["help"]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <PageTitle title={t("help:page.title")} subtitle={t("help:page.subtitle")} />
      </div>

      {HELP_SECTIONS.map((section) => {
        const items: AppAccordionItem[] = Array.from({ length: section.questions }, (_, index) => {
          const n = index + 1;
          return {
            key: `${section.key}-${n}`,
            id: `help-${section.key}-${n}`,
            title: t(`help:sections.${section.key}.q${n}`),
            content: <BodyText>{t(`help:sections.${section.key}.a${n}`)}</BodyText>,
          };
        });

        return (
          <section key={section.key} aria-labelledby={`help-heading-${section.key}`} className="space-y-3">
            <SectionTitle className="scroll-mt-24" id={`help-heading-${section.key}`}>
              {t(`help:sections.${section.key}.title`)}
            </SectionTitle>
            <AppAccordion items={items} alwaysOpen />
          </section>
        );
      })}
    </div>
  );
}
