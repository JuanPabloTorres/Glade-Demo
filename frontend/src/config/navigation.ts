import type { AppIconName } from "../components/atoms/AppIcon";
import { attorneyViewUrl, CASE_SECTION, ROUTES } from "./routes";

/**
 * Where a navigation entry is allowed to appear. Every surface reads the same
 * item list and filters on these flags, so a destination can never exist on one
 * surface and be missing from the other by accident.
 *
 * `bottom` is capped at five entries by BOTTOM_NAV_SLOTS below — a phone bar
 * with more than five targets stops being tappable, so the cap is enforced in
 * one place rather than trusted to whoever edits this list next.
 */
export interface AppNavItem {
  id: string;
  labelKey: string;
  icon: AppIconName;
  /** Destination path; `null` renders the entry disabled (no destination yet). */
  to: string | null;
  /** i18n key for the explanation shown while disabled. */
  disabledReasonKey?: string;
  /** Appears in the mobile bottom navigation. */
  bottom: boolean;
  /** Appears in the tablet/desktop sidebar. */
  sidebar: boolean;
  /**
   * `support` entries sink to the bottom of the sidebar, away from the primary
   * journey. Help lives here: it matters, but never at the cost of one of the
   * five bottom-bar slots.
   */
  group?: "main" | "support";
}

/** Hard cap on the mobile bar. Five targets is the widest a 320px viewport fits. */
export const BOTTOM_NAV_SLOTS = 5;

/**
 * Whether a navigation entry is the one currently open.
 *
 * Several entries share a path and differ only by query — the attorney filters
 * (`/?view=urgent`). The rule that keeps exactly one of them highlighted:
 *
 * - an entry whose `to` carries a query is active when the path matches *and*
 *   every one of its parameters matches the current URL;
 * - an entry with a bare `to` is active when the path matches and the URL
 *   carries none of the parameters the entry's siblings use.
 *
 * Case sections no longer need the query branch at all — they are path
 * segments now (see CASE_SECTION) — but the attorney dashboard's filters
 * legitimately are query state, so the comparison stays query-aware.
 */
export function isNavItemActive(to: string, pathname: string, search: string): boolean {
  const [toPath = "/", toQuery] = to.split("?");

  const pathMatches = toPath === "/" ? pathname === "/" : pathname === toPath || pathname.startsWith(`${toPath}/`);
  if (!pathMatches) return false;

  const current = new URLSearchParams(search);
  if (!toQuery) return !current.has("view");

  for (const [key, value] of new URLSearchParams(toQuery)) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/**
 * Client navigation: Home, My case, Documents, Tasks, Activity, and Help in the
 * support group.
 *
 * **The assistant is deliberately not here.** It had an entry in the sidebar,
 * the raised centre slot of the bottom bar, and a floating launcher on top of
 * both — three controls for one capability, two of which navigated to a page
 * while the third opened a panel over the page you were already on. It now has
 * exactly one entry point, `AiLauncher`, on every breakpoint; `/assistant`
 * still resolves so existing links keep working, and redirects into the panel.
 *
 * "My case" took the slot that freed up in the bar, so the bar stays at five
 * and the phone gains the destination the sidebar always had.
 *
 * Case-scoped entries render disabled until the client has created their first
 * request. They stay visible rather than disappearing — a navigation that
 * changes shape as data arrives is harder to learn than one with honest
 * unavailable states, and the client dashboard's own empty state is what points
 * at "start a request".
 */
export function buildClientNavItems(activeCaseId: string | null): AppNavItem[] {
  const noCaseYet = !activeCaseId;
  const sectionOrNull = (section: (typeof CASE_SECTION)[keyof typeof CASE_SECTION]) =>
    activeCaseId ? ROUTES.caseSection(activeCaseId, section) : null;
  const disabledReasonKey = noCaseYet ? "navigation:sidebar.disabledNoCase" : undefined;

  return [
    {
      id: "home",
      labelKey: "navigation:sidebar.client.home",
      icon: "home",
      to: ROUTES.home,
      bottom: true,
      sidebar: true,
    },
    {
      id: "my-case",
      labelKey: "navigation:sidebar.client.myCase",
      icon: "folder",
      // The overview section, not the bare `/case/:id`. Two reasons: that bare
      // path redirects to this one anyway, and an entry pointing at a path
      // that is a prefix of every section would stay highlighted while the
      // user is on Documents or Tasks.
      to: sectionOrNull(CASE_SECTION.overview),
      disabledReasonKey,
      bottom: true,
      sidebar: true,
    },
    {
      id: "documents",
      labelKey: "navigation:sidebar.client.documents",
      icon: "document",
      to: sectionOrNull(CASE_SECTION.documents),
      disabledReasonKey,
      bottom: true,
      sidebar: true,
    },
    {
      id: "tasks",
      labelKey: "navigation:sidebar.client.tasks",
      icon: "tasks",
      to: sectionOrNull(CASE_SECTION.tasks),
      disabledReasonKey,
      bottom: true,
      sidebar: true,
    },
    {
      id: "activity",
      labelKey: "navigation:sidebar.client.activity",
      icon: "activity",
      to: sectionOrNull(CASE_SECTION.activity),
      disabledReasonKey,
      bottom: true,
      sidebar: true,
    },
    {
      id: "help",
      labelKey: "navigation:sidebar.client.help",
      icon: "help",
      to: ROUTES.help,
      bottom: false,
      sidebar: true,
      group: "support",
    },
  ];
}

/**
 * Attorney navigation. "Actividad" has no cross-case activity feed today —
 * CaseTimeline only renders a single case's events — so it renders disabled
 * with an honest explanation rather than pointing at a fabricated destination.
 *
 * The assistant is absent here for the same reason it is absent from the client
 * list: `AiLauncher` is its one entry point. The attorney's version used to
 * carry `?case=` so the assistant arrived with the open case in context — the
 * panel gets that from the route it is opened over, which is strictly more
 * accurate than a link built when the navigation last rendered.
 */
export function buildAttorneyNavItems(): AppNavItem[] {
  return [
    {
      id: "queue",
      labelKey: "navigation:sidebar.attorney.queue",
      icon: "queue",
      to: ROUTES.home,
      bottom: true,
      sidebar: true,
    },
    {
      id: "urgent",
      labelKey: "navigation:sidebar.attorney.urgent",
      icon: "urgent",
      to: attorneyViewUrl("urgent"),
      bottom: true,
      sidebar: true,
    },
    {
      id: "requested-documents",
      labelKey: "navigation:sidebar.attorney.requestedDocuments",
      icon: "document",
      to: attorneyViewUrl("waiting_client"),
      bottom: true,
      sidebar: true,
    },
    {
      id: "activity",
      labelKey: "navigation:sidebar.attorney.activity",
      icon: "activity",
      to: null,
      disabledReasonKey: "navigation:sidebar.disabledNoActivityFeed",
      bottom: true,
      sidebar: true,
    },
    {
      id: "help",
      labelKey: "navigation:sidebar.attorney.help",
      icon: "help",
      to: ROUTES.help,
      bottom: false,
      sidebar: true,
      group: "support",
    },
  ];
}

/**
 * The bottom bar's entries, in render order.
 *
 * Configuration order is render order now. The re-ordering that used to happen
 * here existed to force the assistant into the centre slot so its raised
 * circle stayed centred whatever order the list was written in; with the
 * assistant out of the bar there is no slot that has to be in a particular
 * place, and a bar that renders its configuration in order is one fewer rule to
 * hold in mind when editing that configuration.
 */
export function bottomNavItems(items: AppNavItem[]): AppNavItem[] {
  return items.filter((item) => item.bottom).slice(0, BOTTOM_NAV_SLOTS);
}

export function sidebarNavItems(items: AppNavItem[]): { main: AppNavItem[]; support: AppNavItem[] } {
  const visible = items.filter((item) => item.sidebar);
  return {
    main: visible.filter((item) => item.group !== "support"),
    support: visible.filter((item) => item.group === "support"),
  };
}
