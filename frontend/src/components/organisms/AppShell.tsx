import { Navbar, NavbarBrand } from "flowbite-react";
import { Link, Outlet } from "react-router";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Navbar fluid rounded={false} className="border-b border-gray-200">
        <NavbarBrand as={Link} to="/">
          <span className="self-center whitespace-nowrap text-xl font-semibold">
            MatterReady
          </span>
        </NavbarBrand>
        <span className="text-xs text-gray-500">Synthetic legal-operations demo</span>
      </Navbar>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
