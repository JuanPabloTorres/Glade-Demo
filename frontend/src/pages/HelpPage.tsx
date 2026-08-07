import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AppIcon, type AppIconName } from "../components/atoms/AppIcon";
import { AppAccordion, type AppAccordionItem } from "../components/molecules/AppAccordion";
import { ROUTES } from "../config/routes";

/**
 * The sections, in the order a user meets them. Each has an icon that refers to
 * what it covers (the same glyph the navigation uses for that area, so the page
 * and the navigation teach each other), and a fixed number of question/answer
 * pairs held in the `help` namespace.
 *
 * The counts live here rather than being inferred from the locale file so a
 * missing translation fails the i18n parity check loudly instead of silently
 * rendering a shorter list in one language.
 */
const SECTIONS: { id: string; icon: AppIconName; questions: number }[] = [
  { id: "gettingStarted", icon: "home", questions: 4 },
  { id: "documents", icon: "document", questions: 4 },
  { id: "tasks", icon: "tasks", questions: 3 },
  { id: "activity", icon: "activity", questions: 3 },
  { id: "assistant", icon: "assistant", questions: 4 },
  { id: "account", icon: "client", questions: 3 },
  { id: "faq", icon: "help", questions: 4 },
];

/**
 * Help, as a disclosure list rather than a wall of prose.
 *
 * Every answer is one accordion panel inside a section, so a user scanning for
 * one thing reads one heading instead of a page. It composes the governed
 * `AppAccordion` (which restores the `aria-expanded`/`aria-controls` that
 * flowbite-react's `AccordionTitle` omits) rather than hand-rolling open/closed
 * state — this page has no disclosure behaviour of its own.
 *
 * `alwaysOpen` because these are independent questions: opening "How do I
 * upload a document" should not collapse the answer above it that the user was
 * comparing against.
 *
 * Platform, legal and accessibility statements are deliberately not here. They
 * live on `/about`, which the footer links into by fragment, and duplicating
 * them would create a second copy to keep in step.
 */
export function HelpPage() {
  const { t } = useTranslation(["help", "common"]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <section className="app-card p-6">
        <h1 className="text-page-title text-heading">{t("help:title")}</h1>
        <p className="mt-3 text-sm leading-6 text-body">{t("help:description")}</p>
        <p className="mt-4 text-sm leading-6 text-body">
          {t("help:aboutHint")}{" "}
          <Link
            to={ROUTES.about}
            className="rounded-base font-semibold text-fg-brand underline underline-offset-2 outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
          >
            {t("help:aboutLink")}
          </Link>
          .
        </p>
      </section>

      {SECTIONS.map((section) => {
        const items: AppAccordionItem[] = Array.from({ length: section.questions }, (_, index) => ({
          key: `${section.id}-${index}`,
          title: t(`help:sections.${section.id}.items.${index}.question`),
          content: (
            <p className="text-sm leading-6 text-body">
              {t(`help:sections.${section.id}.items.${index}.answer`)}
            </p>
          ),
        }));

        return (
          <section key={section.id} aria-labelledby={`help-${section.id}`}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <AppIcon name={section.icon} size={18} />
              </span>
              <h2 id={`help-${section.id}`} className="text-card-title text-heading">
                {t(`help:sections.${section.id}.title`)}
              </h2>
            </div>
            <AppAccordion items={items} alwaysOpen />
          </section>
        );
      })}
    </div>
  );
}
