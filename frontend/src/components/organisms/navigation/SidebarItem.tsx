import { Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { AppIcon, type AppIconName } from "../../atoms/AppIcon";

interface SidebarItemProps {
  labelKey: string;
  icon: AppIconName;
  to: string | null;
  disabledReasonKey?: string;
  onNavigate?: () => void;
}

/**
 * A deep-link shortcut (`to` carries a `?` query) never retains the active
 * highlight — only its parent destination does. See buildClientNavItems /
 * buildAttorneyNavItems in config/navigation.ts for why (the query param is
 * consumed and stripped by the destination page).
 */
function isActive(to: string, pathname: string): boolean {
  const [toPath, toQuery] = to.split("?");
  if (toQuery) return false;
  if (toPath === "/") return pathname === "/";
  return pathname === toPath || pathname.startsWith(`${toPath}/`);
}

/**
 * Single sidebar entry. Supports every state the shell spec calls for:
 * default, hover, active (solid brand-gradient pill, same contrast rule as
 * the old HeaderTab — never a colored background with same-hue text),
 * focus-visible ring, and disabled (no destination yet — rendered as an
 * inert control with a tooltip explaining why, never a dead link).
 */
export function SidebarItem({ labelKey, icon, to, disabledReasonKey, onNavigate }: SidebarItemProps) {
  const { t } = useTranslation(["navigation"]);
  const location = useLocation();
  const label = t(labelKey);

  if (!to) {
    const disabledButton = (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-(--color-text-muted) opacity-50"
      >
        <AppIcon name={icon} size={18} />
        <span className="truncate">{label}</span>
      </button>
    );
    return disabledReasonKey ? (
      <Tooltip content={t(disabledReasonKey)} placement="right">
        {disabledButton}
      </Tooltip>
    ) : (
      disabledButton
    );
  }

  const active = isActive(to, location.pathname);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-indigo-100 ${
        active
          ? "glade-gradient text-white shadow-md shadow-indigo-950/15"
          : "text-(--color-text) hover:bg-indigo-50 hover:text-indigo-700"
      }`}
    >
      <AppIcon name={icon} size={18} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
