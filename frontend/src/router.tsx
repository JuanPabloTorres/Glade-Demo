import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/organisms/AppShell";
import { AboutPlatformPage } from "./pages/AboutPlatformPage";
import { CaseWorkspacePage } from "./pages/CaseWorkspacePage";
import { LoginPage } from "./pages/LoginPage";
import { RoleHomePage } from "./pages/RoleHomePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <RoleHomePage /> },
          { path: "case/:caseId", element: <CaseWorkspacePage /> },
          { path: "about", element: <AboutPlatformPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
