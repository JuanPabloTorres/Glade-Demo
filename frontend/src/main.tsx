import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import { router } from "./router";
import { BankruptcyWorkspaceProvider } from "./workspace/BankruptcyWorkspaceContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BankruptcyWorkspaceProvider>
          <RouterProvider router={router} />
        </BankruptcyWorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
