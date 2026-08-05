import {
  Badge,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";
import { APP_VERSION } from "../../config/version";

const NAV_ITEMS: { href: string; label: string; icon: AppIconName }[] = [
  { href: "/#product", label: "Overview", icon: "sparkles" },
  { href: "/#workflow", label: "Workflow", icon: "review" },
  { href: "/#portfolio", label: "Matters", icon: "portfolio" },
  { href: "/#ai-capabilities", label: "AI controls", icon: "shield" },
];

export function ModernHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Navbar
        fluid
        rounded={false}
        className="mx-auto max-w-screen-2xl bg-transparent px-4 py-3.5 sm:px-6 lg:px-8"
      >
        <NavbarBrand href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-[-0.02em] text-slate-950">
              MatterReady
            </span>
            <span className="block text-xs font-medium tracking-wide text-slate-500">
              AI-assisted matter preparation
            </span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2.5 md:order-2">
          <Badge color="info" className="hidden sm:inline-flex">
            Human-approved workflow
          </Badge>
          <Badge color="gray">v{APP_VERSION}</Badge>
          <NavbarToggle />
        </div>

        <NavbarCollapse>
          {NAV_ITEMS.map((item) => (
            <NavbarLink key={item.href} href={item.href}>
              <span className="flex items-center gap-2">
                <AppIcon name={item.icon} size={16} className="text-blue-700" />
                {item.label}
              </span>
            </NavbarLink>
          ))}
        </NavbarCollapse>
      </Navbar>
    </header>
  );
}
