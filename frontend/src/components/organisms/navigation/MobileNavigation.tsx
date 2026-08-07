import { Drawer, DrawerHeader, DrawerItems } from "flowbite-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoleNavigation } from "../../../hooks/useRoleNavigation";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";

/**
 * Everything navigation-related below 768px: a persistent bottom bar for the
 * primary destinations, plus the Drawer holding the complete list behind
 * "Más". Pairing them here (rather than in AppShell) keeps the open/close
 * state next to the only two things that use it.
 *
 * Both surfaces read `useRoleNavigation()`, the same hook the desktop Sidebar
 * uses, so all three always agree on what this role can reach.
 */
export function MobileNavigation() {
  const { t } = useTranslation(["navigation"]);
  const { items, groupLabel } = useRoleNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <MobileBottomNavigation items={items} onOpenOverflow={() => setDrawerOpen(true)} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} position="left" className="w-72 md:hidden">
        <DrawerHeader title={t("navigation:sidebar.menuTitle")} />
        <DrawerItems>
          <SidebarGroup label={groupLabel}>
            {items.map((item) => (
              <SidebarItem
                key={item.key}
                labelKey={item.labelKey}
                icon={item.icon}
                to={item.to}
                disabledReasonKey={item.disabledReasonKey}
                onNavigate={() => setDrawerOpen(false)}
              />
            ))}
          </SidebarGroup>
        </DrawerItems>
      </Drawer>
    </>
  );
}
