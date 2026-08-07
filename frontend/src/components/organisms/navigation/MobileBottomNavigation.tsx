import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Tooltip } from "flowbite-react";
import { AppIcon } from "../../atoms/AppIcon";
import type { SidebarNavItem } from "../../../config/navigation";

/**
 * How many destinations get a permanent slot. The rest move behind "Más",
 * which opens the same Drawer the sidebar already uses for its full list —
 * four targets plus an overflow control is the widest a 320px viewport fits
 * without the labels truncating.
 */
const PRIMARY_SLOTS = 4;

interface MobileBottomNavigationProps {
  items: SidebarNavItem[];
  /** Opens the navigation Drawer holding every destination, primary ones included. */
  onOpenOverflow: () => void;
}

function isActive(to: string, pathname: string): boolean {
  const [toPath, toQuery] = to.split("?");
  if (toQuery) return false;
  if (toPath === "/") return pathname === "/";
  return pathname === toPath || pathname.startsWith(`${toPath}/`);
}

/**
 * Primary navigation below 768px, replacing the previous arrangement where a
 * single floating menu button was the *only* way to reach any destination —
 * every navigation on a phone cost two taps and hid the current location
 * entirely.
 *
 * This is deliberately not the desktop sidebar re-flowed: an icon rail or a
 * drawer-only pattern gives no persistent "where am I", which is the one thing
 * a bottom bar is for. The desktop sidebar keeps its own collapse behavior
 * (Sidebar.tsx) and simply does not render here.
 *
 * A disabled destination (no case yet) stays visible but inert, with the same
 * tooltip explanation the sidebar gives, rather than disappearing — a nav that
 * changes shape as data arrives is harder to learn than one with honest
 * unavailable states.
 */
export function MobileBottomNavigation({ items, onOpenOverflow }: MobileBottomNavigationProps) {
  const { t } = useTranslation(["navigation"]);
  const location = useLocation();
  const primary = items.slice(0, PRIMARY_SLOTS);

  return (
    <nav
      aria-label={t("navigation:bottomNav.label")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-neutral-primary-soft pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden"
    >
      <ul className="flex items-stretch">
        {primary.map((item) => {
          const label = t(item.labelKey);
          const active = item.to ? isActive(item.to, location.pathname) : false;

          if (!item.to) {
            const disabled = (
              <span
                aria-disabled="true"
                className="flex h-full min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-body opacity-45"
              >
                <AppIcon name={item.icon} size={20} />
                <span className="w-full truncate text-center text-[0.6875rem] leading-tight">{label}</span>
              </span>
            );
            return (
              <li key={item.key} className="min-w-0 flex-1">
                {item.disabledReasonKey ? (
                  <Tooltip content={t(item.disabledReasonKey)}>{disabled}</Tooltip>
                ) : (
                  disabled
                )}
              </li>
            );
          }

          return (
            <li key={item.key} className="min-w-0 flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex h-full min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-soft ${
                  active ? "text-fg-brand" : "text-body hover:text-heading"
                }`}
              >
                <AppIcon name={item.icon} size={20} className={active ? undefined : "shrink-0"} />
                <span
                  className={`w-full truncate text-center text-[0.6875rem] leading-tight ${active ? "font-semibold" : ""}`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}

        <li className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenOverflow}
            aria-label={t("navigation:bottomNav.more")}
            className="flex h-full min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-body outline-none transition-colors hover:text-heading focus-visible:ring-4 focus-visible:ring-brand-soft"
          >
            <AppIcon name="menu" size={20} />
            <span className="w-full truncate text-center text-[0.6875rem] leading-tight">
              {t("navigation:bottomNav.more")}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
