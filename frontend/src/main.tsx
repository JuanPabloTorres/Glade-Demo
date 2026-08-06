import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import { router } from "./router";
import { BankruptcyWorkspaceProvider } from "./workspace/BankruptcyWorkspaceContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BankruptcyWorkspaceProvider>
        <RouterProvider router={router} />
      </BankruptcyWorkspaceProvider>
    </AuthProvider>
  </StrictMode>,
);
