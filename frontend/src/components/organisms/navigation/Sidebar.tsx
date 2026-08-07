import { Tooltip } from "flowbite-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoleNavigation } from "../../../hooks/useRoleNavigation";
import { AppIcon } from "../../atoms/AppIcon";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";

/** Survives reloads so the rail doesn't silently re-expand on every navigation. */
const COLLAPSED_STORAGE_KEY = "freshstart.sidebar.collapsed";

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    // Private-mode / disabled storage: fall back to expanded rather than crash.
    return false;
  }
}

/**
 * Desktop and tablet navigation (>=768px): a collapsible column following
 * Flowbite's sidebar block. Below that breakpoint this renders nothing at all —
 * MobileNavigation owns small screens with a bottom bar plus an overflow
 * Drawer, because re-flowing a desktop sidebar onto a phone (previously: a
 * lone floating menu button) costs two taps per navigation and shows the user
 * nothing about where they currently are.
 *
 * Collapse is hand-rolled rather than adopting flowbite-react's `Sidebar`
 * `collapsed` prop: per docs/ux/UX-SHELL-POLISH-AUDIT-2026-08-06.md §a, its
 * `SidebarItem` is a leaf-only href/icon/label component with no slot for this
 * app's group label, and swapping it would mean re-deriving the active-state
 * contrast rule and the disabled+tooltip pattern that already work here. The
 * surface styling still follows Flowbite's block through the token layer in
 * index.css.
 */
export function Sidebar() {
  const { t } = useTranslation(["navigation"]);
  const { items, groupLabel } = useRoleNavigation();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Preference is a nicety; losing it must never break navigation.
    }
  }, [collapsed]);

  const toggleLabel = collapsed ? t("navigation:sidebar.expand") : t("navigation:sidebar.collapse");

  return (
    <aside
      aria-label={groupLabel}
      className={`hidden shrink-0 border-e border-default bg-neutral-primary-soft p-4 transition-[width] duration-200 md:block ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`mb-3 flex ${collapsed ? "justify-center" : "justify-end"}`}>
        <Tooltip content={toggleLabel} placement="right">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className="flex h-9 w-9 items-center justify-center rounded-base text-body outline-none transition-colors hover:bg-neutral-tertiary hover:text-fg-brand focus-visible:ring-4 focus-visible:ring-brand-soft"
          >
            <AppIcon name="collapse-left" size={18} className={collapsed ? "rotate-180" : undefined} />
          </button>
        </Tooltip>
      </div>

      <SidebarGroup label={groupLabel} collapsed={collapsed}>
        {items.map((item) => (
          <SidebarItem
            key={item.key}
            labelKey={item.labelKey}
            icon={item.icon}
            to={item.to}
            disabledReasonKey={item.disabledReasonKey}
            collapsed={collapsed}
          />
        ))}
      </SidebarGroup>
    </aside>
  );
}
