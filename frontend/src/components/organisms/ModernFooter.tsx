import { Badge, Footer, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../../config/version";
import { AppIcon } from "../atoms/AppIcon";

export function ModernFooter() {
  const { t } = useTranslation(["navigation", "common"]);

  return (
    <Footer container className="rounded-none border-t border-(--color-border) bg-white/92 shadow-none backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-0 py-7 sm:py-8">
        <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md shadow-indigo-950/15">
                <AppIcon name="brand" size={24} />
              </span>
              <div>
                <p className="font-semibold tracking-[-0.015em] text-(--color-text)">{t("navigation:footer.title")}</p>
                <p className="text-sm text-(--color-text-muted)">{t("navigation:footer.subtitle")}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-(--color-text-muted)">
              {t("navigation:footer.disclaimer")}
            </p>
          </div>
          <FooterLinkGroup className="flex-wrap gap-x-6 gap-y-3 lg:justify-end">
            <FooterLink href="/">{t("navigation:footer.portal")}</FooterLink>
            <FooterLink href="/about">{t("navigation:footer.about")}</FooterLink>
            <FooterLink href="/about#privacy">{t("navigation:footer.privacy")}</FooterLink>
            <FooterLink href="/about#security">{t("navigation:footer.security")}</FooterLink>
            <FooterLink href="/about#accessibility">{t("navigation:footer.accessibility")}</FooterLink>
            <FooterLink href="/about#terms">{t("navigation:footer.terms")}</FooterLink>
            <FooterLink href="/about#help">{t("navigation:footer.help")}</FooterLink>
          </FooterLinkGroup>
        </div>
        <FooterDivider />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright href="/" by="FreshStart" year={new Date().getFullYear()} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-(--color-text-muted)">
            <Badge color="indigo">v{APP_VERSION}</Badge>
            <Badge color="gray">{t("common:badges.demo")}</Badge>
            <Badge color="success">{t("common:badges.operational")}</Badge>
            <span className="flex items-center gap-1.5"><AppIcon name="shield" size={15} /> {t("common:badges.humanReviewRequired")}</span>
          </div>
        </div>
      </div>
    </Footer>
  );
}
