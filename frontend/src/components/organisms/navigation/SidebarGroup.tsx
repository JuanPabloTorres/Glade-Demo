import type { ReactNode } from "react";

interface SidebarGroupProps {
  /** Visible heading. Omitted for the support group, which is separated by a rule instead. */
  label?: string;
  /** Accessible name for the `<nav>` landmark. Always supplied — a landmark without a name is noise. */
  navLabel: string;
  children: ReactNode;
  /** Icon-only rail mode: the visible heading is dropped, not its semantics. */
  collapsed?: boolean;
  className?: string;
}

/**
 * A labeled section of sidebar entries. Two groups render today (the role's
 * primary destinations and the support group holding Help), and it is a real
 * reusable grouping rather than a one-off wrapper, so a future "Settings" or
 * "Admin" group slots in without a new component.
 *
 * Each group is its own `<nav>` landmark with an explicit accessible name, so
 * a screen-reader user can tell the primary destinations from the support ones
 * when jumping between landmarks — and the name survives the collapsed rail,
 * where the visible heading is gone.
 */
export function SidebarGroup({ label, navLabel, children, collapsed = false, className = "" }: SidebarGroupProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && !collapsed ? <p className="text-label px-3 pb-1 text-body">{label}</p> : null}
      {label && collapsed ? <hr className="mx-2 mb-2 border-default" /> : null}
      <nav aria-label={navLabel} className="space-y-1">
        {children}
      </nav>
    </div>
  );
}
