import { Badge, Footer, FooterCopyright } from "flowbite-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { APP_VERSION } from "../../config/version";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

interface FooterLink {
  to: string;
  icon: AppIconName;
  labelKey: string;
}

/** One list, both variants — the compact strip is a subset, never a second source. */
const PLATFORM_LINKS: FooterLink[] = [
  { to: "/", icon: "home", labelKey: "navigation:footer.portal" },
  { to: "/about", icon: "info", labelKey: "navigation:footer.about" },
];
const LEGAL_LINKS: FooterLink[] = [
  { to: "/about#privacy", icon: "lock", labelKey: "navigation:footer.privacy" },
  { to: "/about#terms", icon: "terms", labelKey: "navigation:footer.terms" },
];
const SUPPORT_LINKS: FooterLink[] = [
  { to: "/about#security", icon: "shield", labelKey: "navigation:footer.security" },
  { to: "/about#accessibility", icon: "accessibility", labelKey: "navigation:footer.accessibility" },
  // Help is its own page now, not an accordion panel on /about — the fragment
  // link would land on the platform/legal disclosures instead of the answers.
  { to: "/help", icon: "help", labelKey: "navigation:footer.help" },
];

/**
 * Same contrast rule as the sidebar items: the active link sits on a solid
 * brand pill with white text (never a colored background paired with
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
        aria-current={isActive ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-base px-2.5 py-1.5 text-sm font-medium transition-colors ${
          isActive ? "bg-brand text-white" : "text-body hover:bg-neutral-tertiary hover:text-heading"
        }`}
      >
        <AppIcon name={icon} size={15} />
        {label}
      </Link>
    </li>
  );
}

/** Column heading, per Flowbite's footer block (`uppercase`, small, strong). */
function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase text-heading">{title}</h2>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function BuildBadges() {
  const { t } = useTranslation(["common"]);
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-body">
      <Badge color="indigo">v{APP_VERSION}</Badge>
      <Badge color="gray">{t("common:badges.demo")}</Badge>
      <Badge color="success">{t("common:badges.operational")}</Badge>
      <span className="flex items-center gap-1.5">
        <AppIcon name="shield" size={15} /> {t("common:badges.humanReviewRequired")}
      </span>
    </div>
  );
}

interface ModernFooterProps {
  /**
   * `full` — Flowbite's multi-column footer block, for the public/unauthenticated
   * page. `compact` — a single strip for the authenticated workspace, where a
   * large footer under every case screen is navigation the workflow never asks
   * for. Compact keeps the legal disclaimer: for a bankruptcy-preparation
   * product that line is load-bearing, so it is condensed, never dropped.
   */
  variant?: "full" | "compact";
}

/**
 * This is the only place the build version is shown. It used to render here
 * *and* in ModernHeader; one build identity should appear once, and the
 * chrome at the foot of the page is where metadata belongs.
 */
export function ModernFooter({ variant = "full" }: ModernFooterProps) {
  const { t } = useTranslation(["navigation", "common"]);

  if (variant === "compact") {
    return (
      <footer className="border-t border-default bg-neutral-primary-soft">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-xs leading-5 text-body">{t("navigation:footer.disclaimer")}</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ul className="flex flex-wrap items-center gap-1">
              {[...LEGAL_LINKS, ...SUPPORT_LINKS].map((link) => (
                <FooterTab key={link.to} to={link.to} icon={link.icon} label={t(link.labelKey)} />
              ))}
            </ul>
            <BuildBadges />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <Footer container className="rounded-none border-t border-default bg-neutral-primary-soft shadow-none backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-0 py-7 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md shadow-indigo-950/15">
                <AppIcon name="brand" size={24} />
              </span>
              <div>
                <p className="font-semibold tracking-[-0.015em] text-heading">{t("navigation:footer.title")}</p>
                <p className="text-sm text-body">{t("navigation:footer.subtitle")}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-body">{t("navigation:footer.disclaimer")}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <FooterColumn title={t("navigation:footer.groupPlatform")}>
              {PLATFORM_LINKS.map((link) => (
                <FooterTab key={link.to} to={link.to} icon={link.icon} label={t(link.labelKey)} />
              ))}
            </FooterColumn>
            <FooterColumn title={t("navigation:footer.groupLegal")}>
              {LEGAL_LINKS.map((link) => (
                <FooterTab key={link.to} to={link.to} icon={link.icon} label={t(link.labelKey)} />
              ))}
            </FooterColumn>
            <FooterColumn title={t("navigation:footer.groupSupport")}>
              {SUPPORT_LINKS.map((link) => (
                <FooterTab key={link.to} to={link.to} icon={link.icon} label={t(link.labelKey)} />
              ))}
            </FooterColumn>
          </div>
        </div>

        <hr className="my-6 border-default lg:my-8" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright href="/" by="Fresh Start" year={new Date().getFullYear()} />
          <BuildBadges />
        </div>
      </div>
    </Footer>
  );
}
