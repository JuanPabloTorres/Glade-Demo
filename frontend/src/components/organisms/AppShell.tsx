import { Outlet } from "react-router";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--glade-surface)] text-[var(--glade-black)]">
      <ModernHeader />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <Outlet />
      </main>
      <ModernFooter />
    </div>
  );
}
