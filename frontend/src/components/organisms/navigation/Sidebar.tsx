import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { sidebarNavItems } from "../../../config/navigation";
import { useRoleNavigation } from "../../../hooks/useRoleNavigation";
import { AppLogo } from "../../atoms/AppLogo";
import { AppTooltip } from "../../overlays/AppTooltip";
import { IconButton } from "../../ui/IconButton";
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
 * Tablet and desktop navigation (>=768px): a permanent column, part of the app
 * shell's flex row rather than an overlay. Below that breakpoint it renders
 * nothing at all — BottomNavigation owns small screens.
 *
 * Permanent means permanent: no `translate-x`, no drawer, no backdrop, no
 * hamburger. Because the column participates in normal flex flow, page content
 * is offset by the sidebar's real width automatically — there is no `ml-64` to
 * keep in sync with a `w-64`, and therefore no way for the two to drift apart.
 *
 * The width toggle is a preference, not a navigation mechanism: both states are
 * always visible and always navigable, and the collapsed rail keeps every label
 * in the accessibility tree via per-item tooltips and aria-labels. It sits on
 * the brand row rather than on a row of its own — see the comment there.
 *
 * Collapse is hand-rolled rather than adopting flowbite-react's `Sidebar`
 * `collapsed` prop: that component's `SidebarItem` is a leaf-only
 * href/icon/label element with no slot for this app's group label or its
 * disabled+tooltip state. The surface styling still follows Flowbite's block
 * through the token layer in index.css.
 */
export function Sidebar() {
  const { t } = useTranslation(["navigation", "common"]);
  const { items, groupLabel } = useRoleNavigation();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const { main, support } = sidebarNavItems(items);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Preference is a nicety; losing it must never break navigation.
    }
  }, [collapsed]);

  const toggleLabel = collapsed ? t("navigation:sidebar.expand") : t("navigation:sidebar.collapse");

  return (
    // `h-dvh`, not `h-screen`: `100vh` on a mobile browser is taller than the
    // visible viewport while the URL bar is showing, which pushed the rail's
    // foot off screen. `sticky top-0` pins it to the viewport for the whole
    // length of the document — that only works because `html`/`body` use
    // `overflow-x: clip` rather than `hidden`; `hidden` makes the body a scroll
    // container and silently disables every sticky descendant (see index.css).
    // The height is the viewport's, never the content's, so a long page cannot
    // stretch it.
    <aside
      className={`sticky top-0 z-sticky hidden h-dvh shrink-0 flex-col border-e border-default bg-neutral-primary-soft p-4 transition-[width] duration-200 md:flex ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/*
        Brand and collapse toggle on one row.

        The toggle used to sit on a row of its own under the logo, right-aligned
        — a full-width band of empty space between the product name and the
        first navigation item, which read as a gap in the rail rather than as a
        control. It belongs beside the thing it resizes.

        Expanded, it is a quiet trailing affordance next to the name. Collapsed,
        the row has no room for two things, so the rail shows the toggle alone
        (the mark is still one click away as the header's logo, and the toggle
        is what a 5rem rail actually needs). Colour is inherited rather than
        branded: this is a preference, and it must not compete with the primary
        action below it.
      */}
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "gap-1"}`}>
        {collapsed ? null : <AppLogo size="sm" className="min-w-0 flex-1 px-1" />}
        <AppTooltip content={toggleLabel} side="right">
          <IconButton
            onClick={() => setCollapsed((value) => !value)}
            icon="collapse-left"
            iconClassName={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            label={toggleLabel}
            aria-expanded={!collapsed}
            size="sm"
            iconSize={16}
            className="text-body/70 hover:text-heading"
          />
        </AppTooltip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-y-auto">
        <SidebarGroup label={groupLabel} collapsed={collapsed} navLabel={t("navigation:primaryLabel")}>
          {main.map((item) => (
            <SidebarItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </SidebarGroup>

        {/* Help and anything else secondary sits at the foot of the column,
            reachable without competing with the primary journey above it. */}
        {support.length ? (
          <SidebarGroup collapsed={collapsed} navLabel={t("navigation:supportLabel")} className="border-t border-default pt-3">
            {support.map((item) => (
              <SidebarItem key={item.id} item={item} collapsed={collapsed} />
            ))}
          </SidebarGroup>
        ) : null}
      </div>
    </aside>
  );
}
