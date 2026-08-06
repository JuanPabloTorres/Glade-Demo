import { Button } from "flowbite-react";
import { Languages, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { DesktopSidebar } from "../components/navigation/DesktopSidebar";
import { MobileBottomBar } from "../components/navigation/MobileBottomBar";
import { useAuth } from "../features/auth/AuthContext";

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  function toggleLanguage() {
    const next = i18n.language === "es" ? "en" : "es";
    localStorage.setItem("freshstart_language", next);
    void i18n.changeLanguage(next);
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <DesktopSidebar />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:ml-72 lg:px-8">
        <p className="font-bold text-slate-900 lg:hidden">{t("brand")}</p>
        <div className="ml-auto flex gap-2">
          <Button color="light" size="sm" onClick={toggleLanguage} aria-label={t("common.changeLanguage")}><Languages className="h-4 w-4" /></Button>
          <Button color="light" size="sm" className="lg:hidden" onClick={logout} aria-label={t("nav.logout")}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>
      <main className="px-4 pb-24 pt-6 lg:ml-72 lg:px-8 lg:pb-10"><Outlet /></main>
      <MobileBottomBar />
    </div>
  );
}
