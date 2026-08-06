import { Spinner } from "flowbite-react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Spinner size="xl" /></div>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
