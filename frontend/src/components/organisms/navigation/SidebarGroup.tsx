import type { ReactNode } from "react";

interface SidebarGroupProps {
  label?: string;
  children: ReactNode;
}

/**
 * A labeled section of sidebar items. Only one group renders per role today
 * (client nav / attorney nav), but it's a real, reusable grouping — not a
 * one-off wrapper — so a future "Settings" or "Admin" group can slot in
 * without a new component.
 */
export function SidebarGroup({ label, children }: SidebarGroupProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <p className="text-label px-3 pb-1 text-(--color-text-muted)">{label}</p>
      ) : null}
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}
