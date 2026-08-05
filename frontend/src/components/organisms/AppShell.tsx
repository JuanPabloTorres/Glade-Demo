import { Outlet } from "react-router";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";

export function AppShell() {
  return (
    <div className="app-shell-background flex min-h-screen flex-col text-[var(--glade-black)]">
      <ModernHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>
      <ModernFooter />
    </div>
  );
}
