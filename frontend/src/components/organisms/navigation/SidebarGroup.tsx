import type { ReactNode } from "react";

interface SidebarGroupProps {
  label?: string;
  children: ReactNode;
  /** Icon-only rail mode: the visible group heading is dropped, not its semantics. */
  collapsed?: boolean;
}

/**
 * A labeled section of sidebar items. Only one group renders per role today
 * (client nav / attorney nav), but it's a real, reusable grouping — not a
 * one-off wrapper — so a future "Settings" or "Admin" group can slot in
 * without a new component.
 *
 * When collapsed, the heading text is hidden but moves onto the `<nav>` as an
 * `aria-label`, so the grouping stays announced to screen readers instead of
 * vanishing with the visual label. A thin rule replaces it visually so groups
 * remain distinguishable in the icon rail.
 */
export function SidebarGroup({ label, children, collapsed = false }: SidebarGroupProps) {
  return (
    <div className="space-y-1">
      {label && !collapsed ? (
        <p className="text-label px-3 pb-1 text-body">{label}</p>
      ) : null}
      {label && collapsed ? <hr className="mx-2 mb-2 border-default" /> : null}
      <nav aria-label={collapsed ? label : undefined} className="space-y-1">
        {children}
      </nav>
    </div>
  );
}
