import { createBrowserRouter } from "react-router";
import { AppShell } from "./components/organisms/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { MatterDetailPage } from "./pages/MatterDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "matters/:matterId", element: <MatterDetailPage /> },
    ],
  },
]);
