import type { AppIconName } from "../components/atoms/AppIcon";
import { caseFocusUrl, ROUTES } from "./routes";

export interface SidebarNavItem {
  key: string;
  labelKey: string;
  icon: AppIconName;
  /** Destination path; `null` renders the item disabled (no destination yet). */
  to: string | null;
  /** i18n key for the tooltip shown while disabled. */
  disabledReasonKey?: string;
}

/**
 * Whether a navigation entry is the one currently open. Shared by every
 * navigation surface (desktop sidebar, mobile bottom bar, mobile drawer) so
 * they can never disagree about which entry is highlighted.
 *
 * Several entries point at the same path and differ only by query — the case
 * sections (`/case/:id?focus=documents`) and the attorney filters
 * (`/?view=urgent`). The rule that keeps exactly one of them active:
 *
 * - an entry whose `to` carries a query is active when the path matches *and*
 *   every one of its parameters matches the current URL;
 * - an entry with a bare `to` is active only when the path matches and the URL
 *   carries no parameters at all, so "Mi caso" stops being highlighted once a
 *   section of that case is open.
 *
 * This previously returned `false` for any `to` containing a `?`, because the
 * destination page consumed the query and deleted it — so those entries could
 * never match. The page now keeps the stage in the URL, which is what makes
 * this comparison meaningful.
 */
export function isNavItemActive(to: string, pathname: string, search: string): boolean {
  const [toPath, toQuery] = to.split("?");

  const pathMatches = toPath === "/" ? pathname === "/" : pathname === toPath || pathname.startsWith(`${toPath}/`);
  if (!pathMatches) return false;

  const current = new URLSearchParams(search);
  if (!toQuery) return [...current.keys()].length === 0;

  for (const [key, value] of new URLSearchParams(toQuery)) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/**
 * Role-aware nav per the architecture guide §8.2. Client items that depend
 * on an active case (Mi caso/Documentos/Tareas/Actividad) render disabled
 * until the client has created their first request — ClientDashboardPage's
 * own empty state already points them at "Inicio" to start one.
 */
export function buildClientNavItems(activeCaseId: string | null): SidebarNavItem[] {
  const noCaseYet = !activeCaseId;
  return [
    { key: "home", labelKey: "navigation:sidebar.client.home", icon: "home", to: ROUTES.home },
    {
      key: "my-case",
      labelKey: "navigation:sidebar.client.myCase",
      icon: "folder",
      to: activeCaseId ? ROUTES.case(activeCaseId) : null,
      disabledReasonKey: noCaseYet ? "navigation:sidebar.disabledNoCase" : undefined,
    },
    {
      key: "documents",
      labelKey: "navigation:sidebar.client.documents",
      icon: "document",
      to: activeCaseId ? caseFocusUrl(activeCaseId, "documents") : null,
      disabledReasonKey: noCaseYet ? "navigation:sidebar.disabledNoCase" : undefined,
    },
    {
      key: "tasks",
      labelKey: "navigation:sidebar.client.tasks",
      icon: "tasks",
      to: activeCaseId ? caseFocusUrl(activeCaseId, "review") : null,
      disabledReasonKey: noCaseYet ? "navigation:sidebar.disabledNoCase" : undefined,
    },
    {
      key: "activity",
      labelKey: "navigation:sidebar.client.activity",
      icon: "activity",
      to: activeCaseId ? caseFocusUrl(activeCaseId, "tracking") : null,
      disabledReasonKey: noCaseYet ? "navigation:sidebar.disabledNoCase" : undefined,
    },
    { key: "help", labelKey: "navigation:sidebar.client.help", icon: "help", to: ROUTES.help },
  ];
}

/**
 * Attorney "Actividad" has no dedicated cross-case activity feed today —
 * CaseTimeline only renders a single case's events (see CaseWorkspacePage's
 * "tracking" tab). Rather than invent a fake destination, it renders
 * disabled with an honest tooltip until that page exists.
 */
export function buildAttorneyNavItems(): SidebarNavItem[] {
  return [
    { key: "queue", labelKey: "navigation:sidebar.attorney.queue", icon: "queue", to: ROUTES.home },
    { key: "urgent", labelKey: "navigation:sidebar.attorney.urgent", icon: "urgent", to: `${ROUTES.home}?view=urgent` },
    {
      key: "requested-documents",
      labelKey: "navigation:sidebar.attorney.requestedDocuments",
      icon: "document",
      to: `${ROUTES.home}?view=waiting_client`,
    },
    {
      key: "activity",
      labelKey: "navigation:sidebar.attorney.activity",
      icon: "activity",
      to: null,
      disabledReasonKey: "navigation:sidebar.disabledNoActivityFeed",
    },
    { key: "help", labelKey: "navigation:sidebar.attorney.help", icon: "help", to: ROUTES.help },
  ];
}
