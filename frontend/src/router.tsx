import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/organisms/AppShell";
import { CopilotPage } from "./pages/CopilotPage";
import { LoginPage } from "./pages/LoginPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [{ index: true, element: <CopilotPage /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
