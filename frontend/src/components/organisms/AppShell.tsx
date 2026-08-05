import { Outlet } from "react-router";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <ModernHeader />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Outlet />
      </main>
      <ModernFooter />
    </div>
  );
}
