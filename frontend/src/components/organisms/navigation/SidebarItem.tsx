import { Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { type AppNavItem, isNavItemActive } from "../../../config/navigation";
import { AppIcon } from "../../atoms/AppIcon";

interface SidebarItemProps {
  item: AppNavItem;
  onNavigate?: () => void;
  /** Icon-only rail mode, set by the collapsed sidebar. */
  collapsed?: boolean;
}

/**
 * Single sidebar entry. Supports every state the shell spec calls for:
 * default, hover, active (solid brand-gradient pill — the same contrast rule
 * used throughout: never a colored background paired with same-hue text),
 * focus-visible ring, and disabled (no destination yet — an inert control with
 * a tooltip explaining why, never a dead link).
 *
 * Styling follows Flowbite's sidebar block vocabulary (`text-body`,
 * `hover:bg-neutral-tertiary`, `hover:text-fg-brand`, `rounded-base`, the
 * `group`/`group-hover` icon pairing) through the token layer in index.css.
 * The *active* state deliberately does not: Flowbite's block has no active
 * treatment, and this repo's contrast convention is required by
 * .claude/rules/frontend/flowbite-design-system.md.
 *
 * Collapsed mode drops the label to an icon-only rail. Per the same rule
 * ("icon-only exige tooltip y aria-label") every collapsed entry is wrapped in
 * a Tooltip and carries an explicit aria-label — the label never simply
 * disappears from the accessibility tree.
 */
export function SidebarItem({ item, onNavigate, collapsed = false }: SidebarItemProps) {
  const { t } = useTranslation(["navigation"]);
  const location = useLocation();
  const label = t(item.labelKey);

  const shape = collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5";

  if (!item.to) {
    const disabledButton = (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={collapsed ? label : undefined}
        className={`flex w-full cursor-not-allowed items-center rounded-base text-sm font-medium text-body opacity-50 ${shape}`}
      >
        <AppIcon name={item.icon} size={18} />
        {collapsed ? null : <span className="truncate">{label}</span>}
      </button>
    );

    // Collapsed entries always need a tooltip (the label is gone); expanded
    // ones only when there is a reason to explain.
    const disabledTooltip = item.disabledReasonKey
      ? collapsed
        ? `${label} — ${t(item.disabledReasonKey)}`
        : t(item.disabledReasonKey)
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

  const active = isNavItemActive(item.to, location.pathname, location.search);

  // The assistant is the primary action, so when it is not the current page it
  // still reads as an action rather than a peer link — an outlined brand pill,
  // one step below the solid active treatment so the two never compete.
  const idle = item.primaryAction
    ? "border border-brand-medium text-fg-brand hover:bg-brand-soft"
    : "text-body hover:bg-neutral-tertiary hover:text-fg-brand";

  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`group flex items-center rounded-base text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-soft ${shape} ${
        active ? "glade-gradient text-white shadow-md shadow-indigo-950/15" : idle
      }`}
    >
      <AppIcon
        name={item.icon}
        size={18}
        className={active || item.primaryAction ? "shrink-0" : "shrink-0 transition duration-75 group-hover:text-fg-brand"}
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
