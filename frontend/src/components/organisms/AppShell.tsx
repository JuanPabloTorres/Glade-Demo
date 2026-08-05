import { Outlet } from "react-router";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <ModernHeader />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <ModernFooter />
    </div>
  );
}
