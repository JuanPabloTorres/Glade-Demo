import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { buildAttorneyNavItems, buildClientNavItems, type SidebarNavItem } from "../config/navigation";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";

export interface RoleNavigation {
  items: SidebarNavItem[];
  groupLabel: string;
  isAttorney: boolean;
}

/**
 * The single place that resolves "which destinations does this user get".
 *
 * Both navigation surfaces consume it — the desktop Sidebar and the mobile
 * bottom bar/drawer — so a role rule or a case-dependent disabled state can
 * never drift between them. Previously this lived inside Sidebar's own render
 * body, which meant a second surface had to either re-derive it or import a
 * component to get at it.
 */
export function useRoleNavigation(): RoleNavigation {
  const { t } = useTranslation(["navigation"]);
  const auth = useAuth();
  const workspace = useBankruptcyWorkspace();
  const isAttorney = auth.user?.role === "attorney";

  const activeCaseId = workspace.cases.find((item) => item.ownerUserId === auth.user?.id)?.id ?? null;

  return {
    items: isAttorney ? buildAttorneyNavItems() : buildClientNavItems(activeCaseId),
    groupLabel: isAttorney ? t("navigation:sidebar.groupAttorney") : t("navigation:sidebar.groupClient"),
    isAttorney,
  };
}
