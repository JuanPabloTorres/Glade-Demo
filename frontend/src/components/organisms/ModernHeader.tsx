import {
  Badge,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from "flowbite-react";
import { APP_VERSION } from "../../config/version";

export function ModernHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <Navbar
        fluid
        rounded={false}
        className="mx-auto max-w-screen-2xl bg-transparent px-4 py-3 sm:px-6 lg:px-8"
      >
        <NavbarBrand href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-200">
            MR
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-tight text-gray-950">
              MatterReady
            </span>
            <span className="block text-xs font-medium text-gray-500">
              Intelligent case preparation
            </span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-3 md:order-2">
          <Badge color="success" className="hidden sm:inline-flex">
            Human-reviewed AI
          </Badge>
          <Badge color="gray">v{APP_VERSION}</Badge>
          <NavbarToggle />
        </div>

        <NavbarCollapse>
          <NavbarLink href="/#product">Overview</NavbarLink>
          <NavbarLink href="/#workflow">Workflow</NavbarLink>
          <NavbarLink href="/#portfolio">Matter portfolio</NavbarLink>
          <NavbarLink href="/#ai-capabilities">AI controls</NavbarLink>
        </NavbarCollapse>
      </Navbar>
    </header>
  );
}
