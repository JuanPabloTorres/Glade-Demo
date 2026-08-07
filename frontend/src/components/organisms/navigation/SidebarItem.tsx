import { Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { isNavItemActive } from "../../../config/navigation";
import { AppIcon, type AppIconName } from "../../atoms/AppIcon";

interface SidebarItemProps {
  labelKey: string;
  icon: AppIconName;
  to: string | null;
  disabledReasonKey?: string;
  onNavigate?: () => void;
  /** Icon-only rail mode. Set by the desktop Sidebar; the mobile Drawer never collapses. */
  collapsed?: boolean;
}

/**
 * Single sidebar entry. Supports every state the shell spec calls for:
 * default, hover, active (solid brand-gradient pill, same contrast rule as
 * the old HeaderTab — never a colored background with same-hue text),
 * focus-visible ring, and disabled (no destination yet — rendered as an
 * inert control with a tooltip explaining why, never a dead link).
 *
 * Styling follows Flowbite's sidebar block vocabulary (`text-body`,
 * `hover:bg-neutral-tertiary`, `hover:text-fg-brand`, `rounded-base`, the
 * `group`/`group-hover` icon pairing) via the token layer in index.css. The
 * *active* state deliberately does not: Flowbite's block has no active
 * treatment, and this repo's contrast convention (solid gradient + white
 * text) is required by .claude/rules/frontend/flowbite-design-system.md.
 *
 * Collapsed mode drops the label to an icon-only rail. Per the same rule
 * ("icon-only exige tooltip y aria-label") every collapsed item is wrapped in
 * a Tooltip and carries an explicit aria-label — the label never simply
 * disappears from the accessibility tree.
 */
export function SidebarItem({ labelKey, icon, to, disabledReasonKey, onNavigate, collapsed = false }: SidebarItemProps) {
  const { t } = useTranslation(["navigation"]);
  const location = useLocation();
  const label = t(labelKey);

  const shape = collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5";

  if (!to) {
    const disabledButton = (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={collapsed ? label : undefined}
        className={`flex w-full cursor-not-allowed items-center rounded-base text-sm font-medium text-body opacity-50 ${shape}`}
      >
        <AppIcon name={icon} size={18} />
        {collapsed ? null : <span className="truncate">{label}</span>}
      </button>
    );

    // Collapsed items always need a tooltip (the label is gone); expanded ones
    // only when there is a reason to explain.
    const disabledTooltip = disabledReasonKey
      ? collapsed
        ? `${label} — ${t(disabledReasonKey)}`
        : t(disabledReasonKey)
      : collapsed
        ? label
        : null;

    return disabledTooltip ? (
      <Tooltip content={disabledTooltip} placement="right">
        {disabledButton}
      </Tooltip>
    ) : (
      disabledButton
    );
  }

  const active = isNavItemActive(to, location.pathname, location.search);

  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`group flex items-center rounded-base text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-soft ${shape} ${
        active
          ? "glade-gradient text-white shadow-md shadow-indigo-950/15"
          : "text-body hover:bg-neutral-tertiary hover:text-fg-brand"
      }`}
    >
      <AppIcon
        name={icon}
        size={18}
        className={active ? undefined : "shrink-0 transition duration-75 group-hover:text-fg-brand"}
      />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );

  return collapsed ? (
    <Tooltip content={label} placement="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}
