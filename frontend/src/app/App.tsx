import { Navigate, Route, Routes } from "react-router-dom";
import { AssistantPage } from "../features/assistant/AssistantPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { CasesPage } from "../features/cases/CasesPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { IntakePage } from "../features/intake/IntakePage";
import { CaseWorkspacePage } from "../features/workspace/CaseWorkspacePage";
import { AppLayout } from "../layouts/AppLayout";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/workspace" element={<CaseWorkspacePage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/:caseId/workspace" element={<CaseWorkspacePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
