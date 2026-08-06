import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../../constants/navigation";

export function MobileBottomBar() {
  const { t } = useTranslation();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white px-2 pt-2 lg:hidden" aria-label="Mobile navigation">
      {navigationItems.map(({ to, labelKey, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium ${isActive ? "text-cyan-700" : "text-slate-500"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" /><span>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
