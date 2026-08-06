import { Badge, Footer, FooterCopyright, FooterDivider, FooterLinkGroup } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { APP_VERSION } from "../../config/version";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

/**
 * Same contrast rule as the header tabs: the active link sits on a solid
 * indigo pill with white text (never a colored background paired with
 * same-hue text), everything else stays on a neutral surface with muted
 * text that darkens on hover — and every link carries an icon that
 * actually refers to what it links to (a lock for privacy, a shield for
 * security, etc.), not a bare text link.
 */
function FooterTab({ to, icon, label }: { to: string; icon: AppIconName; label: string }) {
  const location = useLocation();
  const isActive = `${location.pathname}${location.hash}` === to;

  return (
    <li>
      <Link
        to={to}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-(--color-text-muted) hover:bg-(--color-surface-muted) hover:text-(--color-text)"
        }`}
      >
        <AppIcon name={icon} size={15} />
        {label}
      </Link>
    </li>
  );
}

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
          <FooterLinkGroup className="flex-wrap gap-x-2 gap-y-2 lg:justify-end">
            <FooterTab to="/" icon="home" label={t("navigation:footer.portal")} />
            <FooterTab to="/about" icon="info" label={t("navigation:footer.about")} />
            <FooterTab to="/about#privacy" icon="lock" label={t("navigation:footer.privacy")} />
            <FooterTab to="/about#security" icon="shield" label={t("navigation:footer.security")} />
            <FooterTab to="/about#accessibility" icon="accessibility" label={t("navigation:footer.accessibility")} />
            <FooterTab to="/about#terms" icon="terms" label={t("navigation:footer.terms")} />
            <FooterTab to="/about#help" icon="help" label={t("navigation:footer.help")} />
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
