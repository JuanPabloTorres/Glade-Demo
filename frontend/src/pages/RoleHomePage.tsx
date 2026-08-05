import { useAuth } from "../auth/AuthContext";
import { AttorneyDashboardPage } from "./AttorneyDashboardPage";
import { ClientDashboardPage } from "./ClientDashboardPage";

export function RoleHomePage() {
  const { user } = useAuth();
  return user?.role === "attorney" ? <AttorneyDashboardPage /> : <ClientDashboardPage />;
}
