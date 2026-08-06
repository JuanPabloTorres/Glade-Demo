import {
  Avatar,
  Badge,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  Label,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarToggle,
  Tooltip,
  useNavbarContext,
} from "flowbite-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { APP_VERSION } from "../../config/version";
import { useAiHealth } from "../../hooks/useAiHealth";
import { LanguageSelector } from "../molecules/LanguageSelector";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../../workspace/caseMetrics";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

/**
 * A header tab is a route + a referential icon (never a generic bullet) so
 * the icon actually maps to what the section is — a folder for the case
 * file, an inbox for the attorney's queue, etc. The active tab renders on
 * the brand gradient with white text (guaranteed contrast on a colored
 * background); the inactive/hover state stays on light, muted-indigo
 * surfaces with dark text — never a colored background paired with
 * same-hue text.
 */
function HeaderTab({ to, icon, label }: { to: string; icon: AppIconName; label: string }) {
  const location = useLocation();
  const { setIsOpen } = useNavbarContext();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(`${to}/`));

  return (
    <li>
      <Link
        to={to}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
          isActive
            ? "glade-gradient text-white shadow-md shadow-indigo-950/15"
            : "text-(--color-text) hover:bg-indigo-50 hover:text-indigo-700"
        }`}
      >
        <AppIcon name={icon} size={17} />
        {label}
      </Link>
    </li>
  );
}

/**
 * Role-aware navigation per master instruction §12. Client sees their own
 * progress/pending-document signals; attorney sees the case queue signals
 * and a client search box. Badge counts are computed from data that's
 * genuinely available today (workspace case list) — no placeholder counts.
 */
export function ModernHeader() {
  const { t } = useTranslation(["navigation", "common"]);
  const auth = useAuth();
  const navigate = useNavigate();
  const workspace = useBankruptcyWorkspace();
  const aiHealth = useAiHealth();
  const [query, setQuery] = useState("");
  const isAttorney = auth.user?.role === "attorney";
  const initials = auth.user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const signOut = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  const clientCases = workspace.cases.filter((item) => item.ownerUserId === auth.user?.id);
  const activeClientCase = clientCases[0];
  const clientPendingDocuments = clientCases.reduce(
    (count, item) => count + item.evidence.filter((evidence) => evidence.status === "requested").length,
    0,
  );
  const clientAttorneyNote = Boolean(activeClientCase?.attorneyNotes?.trim());

  const urgentCases = workspace.cases.filter(
    (item) => item.household.urgentCollectionAction || item.debts.some((debt) => debt.collectionLawsuit),
  );
  const requestedDocuments = workspace.cases.reduce(
    (count, item) => count + item.evidence.filter((evidence) => evidence.status === "requested").length,
    0,
  );

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-(--color-border) bg-white/94 shadow-[0_4px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="glade-gradient h-1" />
      <Navbar fluid rounded={false} className="mx-auto max-w-7xl bg-transparent px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand href="/" className="rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-950/15">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-tight text-(--color-text)">FreshStart</span>
            <span className="block text-xs font-medium text-(--color-text-muted)">{t("common:app.subtitle")}</span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2 md:order-2">
          <LanguageSelector compact />
          {!isAttorney && activeClientCase ? (
            <Tooltip content={t("navigation:header.progressTooltip")}>
              <Badge color="indigo" className="hidden px-2.5 py-1 md:inline-flex">
                {t("navigation:header.progress", { count: localCompletion(activeClientCase) })}
              </Badge>
            </Tooltip>
          ) : null}
          {!isAttorney && clientPendingDocuments > 0 ? (
            <Tooltip content={t("navigation:header.pendingDocumentsTooltip")}>
              <Badge color="warning" className="hidden px-2.5 py-1 md:inline-flex">
                {t("navigation:header.pendingDocuments", { count: clientPendingDocuments })}
              </Badge>
            </Tooltip>
          ) : null}
          {!isAttorney && clientAttorneyNote ? (
            <Tooltip content={t("navigation:header.attorneyNoteTooltip")}>
              <Badge color="info" className="hidden px-2.5 py-1 md:inline-flex">
                {t("navigation:header.attorneyNote")}
              </Badge>
            </Tooltip>
          ) : null}

          {isAttorney ? (
            <Tooltip content={t("navigation:header.assignedCasesTooltip")}>
              <Badge color="gray" className="hidden px-2.5 py-1 md:inline-flex">{t("navigation:header.assignedCases", { count: workspace.cases.length })}</Badge>
            </Tooltip>
          ) : null}
          {isAttorney ? (
            <Tooltip content={t("navigation:header.urgentCasesTooltip")}>
              <Badge color={urgentCases.length ? "failure" : "gray"} className="hidden px-2.5 py-1 md:inline-flex">
                {t("navigation:header.urgentCases", { count: urgentCases.length })}
              </Badge>
            </Tooltip>
          ) : null}
          {isAttorney && requestedDocuments > 0 ? (
            <Tooltip content={t("navigation:header.requestedDocumentsTooltip")}>
              <Badge color="warning" className="hidden px-2.5 py-1 md:inline-flex">
                {t("navigation:header.requestedDocuments", { count: requestedDocuments })}
              </Badge>
            </Tooltip>
          ) : null}
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
          {isAttorney ? (
            <form onSubmit={submitSearch} className="hidden items-center lg:flex">
              <Label htmlFor="attorney-header-search" className="sr-only">{t("navigation:header.searchClient")}</Label>
              <div className="app-input flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5">
                <AppIcon name="search" size={16} className="text-(--color-text-muted)" />
                <input
                  id="attorney-header-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("navigation:header.searchClientPlaceholder")}
                  className="w-40 border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
                />
              </div>
            </form>
          ) : null}

          <Badge color="indigo" className="hidden px-2.5 py-1 sm:inline-flex">v{APP_VERSION}</Badge>
          <Dropdown inline arrowIcon={false} label={<Avatar rounded size="sm" placeholderInitials={initials || "FS"} />}>
            <DropdownHeader>
              <span className="block text-sm font-semibold text-(--color-text)">{auth.user?.name}</span>
              <span className="block truncate text-xs text-(--color-text-muted)">{auth.user?.email}</span>
              <span className="mt-1 block text-xs font-semibold text-indigo-700">{isAttorney ? t("navigation:header.roleAttorney") : t("navigation:header.roleClient")}</span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate("/")}>{isAttorney ? t("navigation:header.homeAttorney") : t("navigation:header.homeClient")}</DropdownItem>
            <DropdownItem onClick={() => navigate("/about")}>
              <span className="flex items-center gap-2"><AppIcon name="help" size={16} /> {t("navigation:header.help")}</span>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={signOut}>{t("navigation:header.logout")}</DropdownItem>
          </Dropdown>
          <NavbarToggle />
        </div>

        <NavbarCollapse>
          <HeaderTab
            to="/"
            icon={isAttorney ? "queue" : "home"}
            label={isAttorney ? t("navigation:header.queue") : t("navigation:header.homeClient")}
          />
          {activeClientCase ? (
            <HeaderTab to={`/case/${activeClientCase.id}`} icon="folder" label={t("navigation:header.workspace")} />
          ) : null}
          <HeaderTab to="/about" icon="help" label={t("navigation:header.help")} />
        </NavbarCollapse>
      </Navbar>
    </header>
  );
}
