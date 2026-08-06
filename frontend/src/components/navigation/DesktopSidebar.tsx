import { Button } from "flowbite-react";
import { LogOut, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../../constants/navigation";
import { useAuth } from "../../features/auth/AuthContext";

export function DesktopSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-600 text-white"><Sparkles className="h-5 w-5" /></div>
        <div><p className="font-bold text-slate-900">{t("brand")}</p><p className="text-xs text-slate-500">{t("brandTagline")}</p></div>
      </div>
      <nav className="mt-8 space-y-2" aria-label={t("common.primaryNavigation")}>
        {navigationItems.map(({ to, labelKey, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />{t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-xl bg-slate-50 p-4">
        <p className="truncate text-sm font-semibold text-slate-800">{user?.full_name}</p>
        <p className="truncate text-xs text-slate-500">{user?.role}</p>
        <Button color="light" size="sm" className="mt-3 w-full" onClick={logout}><LogOut className="mr-2 h-4 w-4" />{t("nav.logout")}</Button>
      </div>
    </aside>
  );
}
