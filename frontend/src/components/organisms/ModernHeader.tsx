import {
  Avatar,
  Badge,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from "flowbite-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { APP_VERSION } from "../../config/version";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

const NAV_ITEMS: { href: string; label: string; icon: AppIconName }[] = [
  { href: "/", label: "Workspace", icon: "portfolio" },
  { href: "/#workflow", label: "How it works", icon: "review" },
  { href: "/#portfolio", label: "Matters", icon: "readiness" },
];

export function ModernHeader() {
  const auth = useAuth();
  const navigate = useNavigate();
  const initials = auth.user?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const signOut = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Navbar fluid rounded={false} className="mx-auto max-w-screen-2xl bg-transparent px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-[-0.02em] text-slate-950">MatterReady</span>
            <span className="block text-xs font-medium text-slate-500">Reviewer workspace</span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2 md:order-2">
          <Badge color="gray" className="hidden sm:inline-flex">v{APP_VERSION}</Badge>
          <Dropdown
            inline
            arrowIcon={false}
            label={<Avatar rounded size="sm" placeholderInitials={initials || "MR"} />}
          >
            <DropdownHeader>
              <span className="block text-sm font-semibold">{auth.user?.name}</span>
              <span className="block truncate text-xs text-slate-500">{auth.user?.email}</span>
              <span className="mt-1 block text-xs font-medium text-blue-700">{auth.user?.role}</span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate("/")}>Workspace</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={signOut}>Sign out</DropdownItem>
          </Dropdown>
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
