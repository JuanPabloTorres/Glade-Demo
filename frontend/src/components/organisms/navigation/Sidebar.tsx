import { Drawer, DrawerHeader, DrawerItems } from "flowbite-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { buildAttorneyNavItems, buildClientNavItems } from "../../../config/navigation";
import { useBankruptcyWorkspace } from "../../../workspace/BankruptcyWorkspaceContext";
import { AppIcon } from "../../atoms/AppIcon";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";

function SidebarNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation(["navigation"]);
  const auth = useAuth();
  const workspace = useBankruptcyWorkspace();
  const isAttorney = auth.user?.role === "attorney";

  const activeCaseId = workspace.cases.find((item) => item.ownerUserId === auth.user?.id)?.id ?? null;
  const items = isAttorney ? buildAttorneyNavItems() : buildClientNavItems(activeCaseId);
  const groupLabel = isAttorney ? t("navigation:sidebar.groupAttorney") : t("navigation:sidebar.groupClient");

  return (
    <SidebarGroup label={groupLabel}>
      {items.map((item) => (
        <SidebarItem
          key={item.key}
          labelKey={item.labelKey}
          icon={item.icon}
          to={item.to}
          disabledReasonKey={item.disabledReasonKey}
          onNavigate={onNavigate}
        />
      ))}
    </SidebarGroup>
  );
}

/**
 * Persistent app-shell navigation, replacing the role-aware tabs that used
 * to live in ModernHeader (see AppShell.tsx). Desktop (>=768px) renders a
 * fixed column; below 768px it collapses into a Flowbite Drawer opened by a
 * floating menu button, matching the existing AI chat drawer pattern in
 * ChatEntryPoint (AppShell.tsx) rather than reusing the header's old
 * Navbar collapse.
 */
export function Sidebar() {
  const { t } = useTranslation(["navigation"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-(--color-border) bg-white/94 p-4 md:block">
        <SidebarNavContent />
      </aside>

      <button
        type="button"
        aria-label={t("navigation:sidebar.openMenu")}
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-(--color-border) bg-white/94 text-(--color-text) shadow-md backdrop-blur-xl md:hidden"
      >
        <AppIcon name="menu" size={20} />
      </button>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} position="left" className="w-72 md:hidden">
        <DrawerHeader title={t("navigation:sidebar.menuTitle")} />
        <DrawerItems>
          <SidebarNavContent onNavigate={() => setMobileOpen(false)} />
        </DrawerItems>
      </Drawer>
    </>
  );
}
