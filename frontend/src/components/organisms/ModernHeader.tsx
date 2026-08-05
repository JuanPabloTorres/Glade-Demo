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
import { AppIcon } from "../atoms/AppIcon";

export function ModernHeader() {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAttorney = auth.user?.role === "attorney";
  const initials = auth.user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const signOut = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--glade-border)] bg-white/94 shadow-[0_4px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="glade-gradient h-1" />
      <Navbar fluid rounded={false} className="mx-auto max-w-7xl bg-transparent px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand href="/" className="rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-950/15">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-[-0.025em] text-[var(--glade-black)]">FreshStart</span>
            <span className="block text-xs font-medium text-[var(--glade-muted)]">Bankruptcy case guidance</span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2 md:order-2">
          <Badge color="indigo" className="hidden px-2.5 py-1 sm:inline-flex">v{APP_VERSION}</Badge>
          <Dropdown inline arrowIcon={false} label={<Avatar rounded size="sm" placeholderInitials={initials || "FS"} />}>
            <DropdownHeader>
              <span className="block text-sm font-semibold text-[var(--glade-black)]">{auth.user?.name}</span>
              <span className="block truncate text-xs text-[var(--glade-muted)]">{auth.user?.email}</span>
              <span className="mt-1 block text-xs font-semibold text-indigo-700">{isAttorney ? "Abogado" : "Cliente"}</span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate("/")}>{isAttorney ? "Bandeja de casos" : "Mi solicitud"}</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={signOut}>Cerrar sesión</DropdownItem>
          </Dropdown>
          <NavbarToggle />
        </div>

        <NavbarCollapse>
          <NavbarLink href="/" className="rounded-lg px-3 py-2 font-medium">Inicio</NavbarLink>
          <NavbarLink href="/#how-it-works" className="rounded-lg px-3 py-2 font-medium">Cómo funciona</NavbarLink>
          <NavbarLink href="/case/case-elena-demo" className="rounded-lg px-3 py-2 font-medium">Expediente</NavbarLink>
        </NavbarCollapse>
      </Navbar>
    </header>
  );
}
