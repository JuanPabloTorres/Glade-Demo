import { Card, Spinner } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

/**
 * Session-restore gate. The interstitial previously used raw palette classes
 * (`bg-slate-50`, `text-slate-700`) and a hardcoded English sentence — the one
 * screen a returning Spanish user sees first, in English. Both now go through
 * the design tokens and the locale files.
 */
export function ProtectedRoute() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const location = useLocation();

  if (auth.isInitializing) {
    return (
      <div className="app-shell-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <div role="status" className="flex flex-col items-center gap-3 py-4">
            <Spinner size="lg" />
            <p className="font-medium text-heading">{t("states.restoringSession")}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
