import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { type AppNavItem, buildAttorneyNavItems, buildClientNavItems } from "../config/navigation";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";

export interface RoleNavigation {
  items: AppNavItem[];
  groupLabel: string;
  isAttorney: boolean;
  /** The case the client's section links point at — null before their first request. */
  activeCaseId: string | null;
}

/**
 * The single place that resolves "which destinations does this user get".
 *
 * Both navigation surfaces consume it — the sidebar and the bottom bar — so a
 * role rule or a case-dependent disabled state can never drift between them.
 * Neither surface builds its own list; they filter this one on the `sidebar` /
 * `bottom` flags each item already carries.
 */
export function useRoleNavigation(): RoleNavigation {
  const { t } = useTranslation(["navigation"]);
  const auth = useAuth();
  const workspace = useBankruptcyWorkspace();
  const location = useLocation();
  const isAttorney = auth.user?.role === "attorney";

  // A client has exactly one case, resolved from their account. An attorney
  // works across cases, so theirs is whichever one the route currently names.
  const activeCaseId = isAttorney
    ? (location.pathname.match(/^\/case\/([^/]+)/)?.[1] ?? null)
    : (workspace.cases.find((item) => item.ownerUserId === auth.user?.id)?.id ?? null);

  return {
    items: isAttorney ? buildAttorneyNavItems(activeCaseId) : buildClientNavItems(activeCaseId),
    groupLabel: isAttorney ? t("navigation:sidebar.groupAttorney") : t("navigation:sidebar.groupClient"),
    isAttorney,
    activeCaseId,
  };
}
