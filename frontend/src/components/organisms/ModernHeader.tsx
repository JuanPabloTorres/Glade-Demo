import {
  Avatar,
  Badge,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  Navbar,
  NavbarBrand,
  Tooltip,
} from "flowbite-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { APP_VERSION } from "../../config/version";
import { ROUTES } from "../../config/routes";
import { useAiHealth } from "../../hooks/useAiHealth";
import { LanguageSelector } from "../molecules/LanguageSelector";
import { AppIcon } from "../atoms/AppIcon";

/**
 * Trimmed per the app-shell refactor (phase 1): primary navigation (the old
 * role-aware HeaderTab links) and every role-specific summary badge/search
 * box now live in the Sidebar (navigation/Sidebar.tsx) or on the dashboards
 * themselves — AttorneyDashboardPage already has its own search via
 * DataTableToolbar, and both dashboards already surface completion/urgent/
 * pending-document counts as metric tiles, so nothing here was lost, only
 * de-duplicated. What remains is exactly five responsibilities: contextual
 * title (brand block), language selector, AI status badge, version badge,
 * profile dropdown. Left padding accounts for the fixed mobile menu button
 * Sidebar renders in this same corner below 768px.
 */
export function ModernHeader() {
  const { t } = useTranslation(["navigation", "common"]);
  const auth = useAuth();
  const navigate = useNavigate();
  const aiHealth = useAiHealth();
  const isAttorney = auth.user?.role === "attorney";
  const initials = auth.user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const signOut = () => {
    auth.logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-(--color-border) bg-white/94 shadow-[0_4px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="glade-gradient h-1" />
      <Navbar fluid rounded={false} className="mx-auto max-w-7xl bg-transparent py-3 pl-16 pr-4 sm:pr-6 md:pl-4 md:px-6 lg:px-8">
        <NavbarBrand href={ROUTES.home} className="rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-950/15">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-tight text-(--color-text)">FreshStart</span>
            <span className="block text-xs font-medium text-(--color-text-muted)">{t("common:app.subtitle")}</span>
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

          <Badge color="indigo" className="hidden px-2.5 py-1 sm:inline-flex">v{APP_VERSION}</Badge>

          <Dropdown inline arrowIcon={false} label={<Avatar rounded size="sm" placeholderInitials={initials || "FS"} />}>
            <DropdownHeader>
              <span className="block text-sm font-semibold text-(--color-text)">{auth.user?.name}</span>
              <span className="block truncate text-xs text-(--color-text-muted)">{auth.user?.email}</span>
              <span className="mt-1 block text-xs font-semibold text-indigo-700">{isAttorney ? t("navigation:header.roleAttorney") : t("navigation:header.roleClient")}</span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate(ROUTES.home)}>{isAttorney ? t("navigation:header.homeAttorney") : t("navigation:header.homeClient")}</DropdownItem>
            <DropdownItem onClick={() => navigate(ROUTES.about)}>
              <span className="flex items-center gap-2"><AppIcon name="help" size={16} /> {t("navigation:header.help")}</span>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={signOut}>{t("navigation:header.logout")}</DropdownItem>
          </Dropdown>
        </div>
      </Navbar>
    </header>
  );
}
