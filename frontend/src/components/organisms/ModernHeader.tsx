import { Badge, Navbar, NavbarBrand, Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "../../config/routes";
import { useAiHealth } from "../../hooks/useAiHealth";
import { LanguageSelector } from "../molecules/LanguageSelector";
import { AppIcon } from "../atoms/AppIcon";
import { UserMenu } from "./navigation/UserMenu";

/**
 * Trimmed per the app-shell refactor (phase 1): primary navigation (the old
 * role-aware HeaderTab links) and every role-specific summary badge/search
 * box now live in the Sidebar (navigation/Sidebar.tsx) or on the dashboards
 * themselves — AttorneyDashboardPage already has its own search via
 * DataTableToolbar, and both dashboards already surface completion/urgent/
 * pending-document counts as metric tiles, so nothing here was lost, only
 * de-duplicated. What remains is exactly four responsibilities: contextual
 * title (brand block), language selector, AI status badge, profile dropdown.
 *
 * The version badge deliberately does NOT live here — it was duplicated in
 * both header and footer; ModernFooter is now its only home (one build
 * identity, shown once, in the chrome where metadata belongs).
 *
 * The avatar dropdown is `<UserMenu />`, not inline markup, so the product has
 * a single avatar-menu implementation.
 */
export function ModernHeader() {
  const { t } = useTranslation(["navigation", "common"]);
  const aiHealth = useAiHealth();

  return (
    <header className="sticky top-0 z-20 border-b border-default bg-neutral-primary-soft shadow-[0_4px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="glade-gradient h-1" />
      <Navbar fluid rounded={false} className="mx-auto max-w-7xl bg-transparent px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand href={ROUTES.home} className="rounded-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-950/15">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-tight text-heading">FreshStart</span>
            <span className="block text-xs font-medium text-body">{t("common:app.subtitle")}</span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2">
          <LanguageSelector compact />

          <Tooltip
            content={
              aiHealth.loading
                ? t("navigation:header.aiStatusLoading")
                : aiHealth.data
                  ? t("navigation:header.aiProvider", { provider: aiHealth.data.provider, model: aiHealth.data.model })
                  : t("navigation:header.aiStatusUnavailable")
            }
          >
            <button
              type="button"
              onClick={() => void aiHealth.refresh()}
              className="hidden md:inline-flex"
              aria-label={t("navigation:header.refreshAiStatus")}
            >
              <Badge color={aiHealth.data?.available ? "success" : "warning"} className="px-2.5 py-1">
                {aiHealth.data?.available ? t("navigation:header.aiConnected") : t("navigation:header.aiDisconnected")}
              </Badge>
            </button>
          </Tooltip>

          <UserMenu />
        </div>
      </Navbar>
    </header>
  );
}
