import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./i18n/i18n";
import "./index.css";
import { router } from "./router";
import { BankruptcyWorkspaceProvider } from "./workspace/BankruptcyWorkspaceContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <BankruptcyWorkspaceProvider>
          <RouterProvider router={router} />
        </BankruptcyWorkspaceProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
