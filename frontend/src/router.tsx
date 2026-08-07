import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/organisms/AppShell";
import { ROUTES } from "./config/routes";
import { AboutPlatformPage } from "./pages/AboutPlatformPage";
import { AssistantPage } from "./pages/AssistantPage";
import { CaseWorkspacePage } from "./pages/CaseWorkspacePage";
import { HelpPage } from "./pages/HelpPage";
import { LoginPage } from "./pages/LoginPage";
import { RoleHomePage } from "./pages/RoleHomePage";

/**
 * `case/:caseId/:section?` is what makes the workspace's sections real
 * destinations: Documents, Tasks and Activity are path segments, so they
 * survive a reload, take part in browser back/forward, and can hold an active
 * state in the navigation. The optional form keeps `/case/:id` working — the
 * page redirects it to the canonical overview section.
 */
export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTES.home,
        element: <AppShell />,
        children: [
          { index: true, element: <RoleHomePage /> },
          { path: "case/:caseId", element: <CaseWorkspacePage /> },
          { path: "case/:caseId/:section", element: <CaseWorkspacePage /> },
          { path: "assistant", element: <AssistantPage /> },
          { path: "help", element: <HelpPage /> },
          { path: "about", element: <AboutPlatformPage /> },
          { path: "help", element: <HelpPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to={ROUTES.home} replace /> },
]);
