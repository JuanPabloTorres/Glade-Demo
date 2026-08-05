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
    <header className="sticky top-0 z-30 border-b border-[var(--glade-border)] bg-white/95 backdrop-blur">
      <div className="glade-gradient h-1" />
      <Navbar fluid rounded={false} className="mx-auto max-w-screen-2xl bg-transparent px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand href="/">
          <span className="glade-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm">
            <AppIcon name="brand" size={25} />
          </span>
          <span className="ml-3 self-center whitespace-nowrap">
            <span className="block text-lg font-semibold tracking-[-0.02em] text-[#111111]">FreshStart</span>
            <span className="block text-xs font-medium text-[#5f5f5f]">Bankruptcy case guidance</span>
          </span>
        </NavbarBrand>
        <div className="flex items-center gap-2 md:order-2">
          <Badge color="gray" className="hidden sm:inline-flex">v{APP_VERSION}</Badge>
          <Dropdown inline arrowIcon={false} label={<Avatar rounded size="sm" placeholderInitials={initials || "FS"} />}>
            <DropdownHeader>
              <span className="block text-sm font-semibold">{auth.user?.name}</span>
              <span className="block truncate text-xs text-[#5f5f5f]">{auth.user?.email}</span>
              <span className="mt-1 block text-xs font-medium text-[#111111]">
                {isAttorney ? "Abogado" : "Cliente"}
              </span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate("/")}>{isAttorney ? "Bandeja de casos" : "Mi solicitud"}</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={signOut}>Cerrar sesión</DropdownItem>
          </Dropdown>
          <NavbarToggle />
        </div>
        <NavbarCollapse>
          <NavbarLink href="/">Inicio</NavbarLink>
          <NavbarLink href="/#how-it-works">Cómo funciona</NavbarLink>
          <NavbarLink href="/case/case-elena-demo">Expediente</NavbarLink>
        </NavbarCollapse>
      </Navbar>
    </header>
  );
}
