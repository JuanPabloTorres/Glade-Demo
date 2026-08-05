import { Badge, Navbar, NavbarBrand } from "flowbite-react";
import { Link, Outlet } from "react-router";

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <Navbar
          fluid
          rounded={false}
          className="mx-auto max-w-screen-2xl bg-transparent px-4 py-3 sm:px-6 lg:px-8"
        >
          <NavbarBrand>
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm">
                MR
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight text-gray-900">
                  MatterReady
                </span>
                <span className="block text-xs text-gray-500">
                  AI-ready case preparation
                </span>
              </span>
            </Link>
          </NavbarBrand>

          <div className="hidden items-center gap-3 sm:flex">
            <Badge color="success">Human-approved workflow</Badge>
            <span className="text-xs font-medium text-gray-500">
              Structured intake · document intelligence · review readiness
            </span>
          </div>
        </Navbar>
      </header>

      <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-gray-500 sm:px-6 lg:px-8">
          <span>MatterReady · Review-first document intelligence</span>
          <span>React · TypeScript · FastAPI · automated validation</span>
        </div>
      </footer>
    </div>
  );
}
