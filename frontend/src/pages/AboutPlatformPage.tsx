import { Accordion, AccordionContent, AccordionPanel, AccordionTitle, Badge, Card } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../config/version";

/**
 * Master instruction §13: technical/reviewer-facing detail lives here, not in
 * the client/attorney-facing footer. Linked from the footer and the header's
 * "Ayuda" entry for both roles.
 */
export function AboutPlatformPage() {
  const { t } = useTranslation(["workspace", "common"]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="app-card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">{t("workspace:about.title")}</h1>
          <Badge color="indigo">v{APP_VERSION}</Badge>
          <Badge color="gray">{t("common:badges.demo")}</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {t("workspace:about.description")}
        </p>
      </Card>

      <Accordion>
        <AccordionPanel>
          <AccordionTitle id="privacy">{t("workspace:about.sections.privacy.title")}</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {t("workspace:about.sections.privacy.content")}
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="security">{t("workspace:about.sections.security.title")}</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {t("workspace:about.sections.security.content")}
              <code className="mx-1 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">SECURITY.md</code>.
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="accessibility">{t("workspace:about.sections.accessibility.title")}</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {t("workspace:about.sections.accessibility.content")}
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="terms">{t("workspace:about.sections.terms.title")}</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {t("workspace:about.sections.terms.content")}
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="help">{t("workspace:about.sections.help.title")}</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {t("workspace:about.sections.help.content")}
              <code className="mx-1 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">SECURITY.md</code>.
            </p>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>
  );
}
