import { Avatar, Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { ROUTES } from "../../../config/routes";
import { AppIcon, type AppIconName } from "../../atoms/AppIcon";

/** Initials fall back to the product mark when a name is missing or unparsable. */
function initialsOf(name: string | undefined): string {
  const parsed = name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return parsed || "FS";
}

function MenuEntry({ icon, label, danger = false }: { icon: AppIconName; label: string; danger?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${danger ? "text-fg-danger" : ""}`}>
      <AppIcon name={icon} size={16} /> {label}
    </span>
  );
}

/**
 * The authenticated user's identity and account actions, following Flowbite's
 * avatar-dropdown block: identity header (name / email / role) on a ruled row,
 * then the action list, with sign-out last and in `text-fg-danger`.
 *
 * Extracted from ModernHeader so there is exactly one avatar menu in the
 * product. Any surface needing it composes `<UserMenu />` rather than
 * rebuilding the dropdown — the duplication this prevents is the reason the
 * component exists at all.
 *
 * The entries are deliberately limited to destinations that exist. Flowbite's
 * sample menu shows Dashboard/Settings/Earnings; this app has no profile or
 * settings screen, and rendering a menu item that goes nowhere would be
 * exactly the decorative fake control the UI directive forbids.
 */
export function UserMenu() {
  const { t } = useTranslation(["navigation"]);
  const auth = useAuth();
  const navigate = useNavigate();
  const isAttorney = auth.user?.role === "attorney";

  const signOut = () => {
    auth.logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <Dropdown
      inline
      arrowIcon={false}
      label={<Avatar rounded size="sm" placeholderInitials={initialsOf(auth.user?.name)} />}
      className="w-56 rounded-base border border-default-medium bg-neutral-primary-medium shadow-lg"
    >
      <DropdownHeader className="border-b border-default-medium">
        <span className="block text-sm font-semibold text-heading">{auth.user?.name}</span>
        <span className="block truncate text-xs text-body">{auth.user?.email}</span>
        <span className="mt-1 block text-xs font-semibold text-fg-brand">
          {isAttorney ? t("navigation:header.roleAttorney") : t("navigation:header.roleClient")}
        </span>
      </DropdownHeader>

      <DropdownItem onClick={() => navigate(ROUTES.home)}>
        <MenuEntry
          icon="home"
          label={isAttorney ? t("navigation:header.homeAttorney") : t("navigation:header.homeClient")}
        />
      </DropdownItem>
      <DropdownItem onClick={() => navigate(ROUTES.help)}>
        <MenuEntry icon="help" label={t("navigation:header.help")} />
      </DropdownItem>

      <DropdownDivider />

      <DropdownItem onClick={signOut}>
        <MenuEntry icon="logout" label={t("navigation:header.logout")} danger />
      </DropdownItem>
    </Dropdown>
  );
}
