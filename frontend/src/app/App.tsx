import { Navigate, Route, Routes } from "react-router-dom";
import { AssistantPage } from "../features/assistant/AssistantPage";
import { CasesPage } from "../features/cases/CasesPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { IntakePage } from "../features/intake/IntakePage";
import { AppLayout } from "../layouts/AppLayout";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/assistant" replace />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/cases" element={<CasesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/assistant" replace />} />
    </Routes>
  );
}
