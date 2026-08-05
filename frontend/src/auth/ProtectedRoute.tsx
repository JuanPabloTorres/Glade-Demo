import { Card, Spinner } from "flowbite-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner size="lg" />
            <p className="font-medium text-slate-700">Restoring your secure workspace</p>
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
