import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { type AppNavItem, bottomNavItems, isNavItemActive } from "../../../config/navigation";
import { useRoleNavigation } from "../../../hooks/useRoleNavigation";
import { AppIcon } from "../../atoms/AppIcon";

/**
 * Shared shape for every slot: a full-height, full-width tap target so the
 * touch area is the whole cell rather than just the glyph. At the bar's 4.5rem
 * height every cell clears the 44px minimum comfortably.
 */
const SLOT = "flex h-full w-full flex-col items-center justify-center gap-1 px-0.5 outline-none focus-visible:ring-4 focus-visible:ring-brand-soft";
const LABEL = "w-full truncate text-center text-[0.625rem] font-medium leading-tight";

function SlotLabel({ children, active }: { children: string; active?: boolean }) {
  return <span className={`${LABEL} ${active ? "font-semibold" : ""}`}>{children}</span>;
}

/**
 * The raised centre action. The assistant is the product's primary capability,
 * so it gets the one visually distinct slot — a solid brand-gradient circle
 * rather than a flat icon.
 *
 * It is a real `<Link>` to a real route, not a `+` button opening a sheet: the
 * action is "go to the assistant", and a control that navigates should look and
 * behave like navigation, including middle-click and browser back.
 */
function PrimarySlot({ item, label, active }: { item: AppNavItem; label: string; active: boolean }) {
  const circle = `flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform ${
    active ? "glade-gradient scale-105 shadow-indigo-950/30" : "glade-gradient shadow-indigo-950/20 hover:scale-105"
  }`;

  if (!item.to) return null;

  return (
    <Link to={item.to} aria-current={active ? "page" : undefined} className={`${SLOT} -mt-3`}>
      <span className={circle}>
        <AppIcon name={item.icon} size={22} />
      </span>
      <SlotLabel active={active}>{label}</SlotLabel>
    </Link>
  );
}

/**
 * Primary navigation below 768px.
 *
 * This is the only navigation surface on a phone — there is no sidebar, no
 * hamburger and no drawer here, because a drawer gives no persistent "where am
 * I" and costs two taps per navigation. The sidebar simply does not render at
 * this width (see Sidebar.tsx), rather than being re-flowed into a phone.
 *
 * Layout follows Flowbite's floating bottom-navigation block: a `rounded-full`
 * bar, horizontally centred, held off the bottom edge, capped at `max-w-lg`,
 * five equal columns. Two departures from that block, both deliberate:
 *
 * - The block's items are icon-only with tooltips. Tooltips need a hover a
 *   touch device does not have, so every slot carries a visible label. That is
 *   what sets the bar's height (4.5rem instead of 4rem).
 * - The block pins itself with `bottom-4`, which sits under the home indicator
 *   on a notched phone. The outer wrapper adds `env(safe-area-inset-bottom)` to
 *   that offset instead, and `px-4` guarantees a real side margin so the bar
 *   never touches the viewport edges at 320px.
 *
 * The wrapper is `pointer-events-none` so the transparent gutter around the
 * pill does not swallow taps meant for the page beneath it; the pill itself
 * re-enables them.
 *
 * A destination that is not available yet (a client with no case) stays visible
 * but inert with the same explanation the sidebar gives, rather than
 * disappearing — a navigation that changes shape as data arrives is harder to
 * learn than one with honest unavailable states.
 */
export function BottomNavigation() {
  const { t } = useTranslation(["navigation"]);
  const { items } = useRoleNavigation();
  const location = useLocation();
  const slots = bottomNavItems(items);

  return (
    <nav
      aria-label={t("navigation:bottomNav.label")}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-nav px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
    >
      <ul className="pointer-events-auto mx-auto grid h-[4.5rem] w-full max-w-lg grid-cols-5 items-stretch rounded-full border border-default bg-neutral-primary-soft shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
        {slots.map((item) => {
          const label = t(item.labelKey);
          const active = item.to ? isNavItemActive(item.to, location.pathname, location.search) : false;

          if (!item.to) {
            return (
              <li key={item.id} className="min-w-0">
                <span
                  aria-disabled="true"
                  title={item.disabledReasonKey ? t(item.disabledReasonKey) : undefined}
                  className={`${SLOT} text-body opacity-45`}
                >
                  <AppIcon name={item.icon} size={20} />
                  <SlotLabel>{label}</SlotLabel>
                </span>
              </li>
            );
          }

          if (item.primaryAction) {
            return (
              <li key={item.id} className="min-w-0">
                <PrimarySlot item={item} label={label} active={active} />
              </li>
            );
          }

          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`${SLOT} rounded-full transition-colors ${
                  active ? "text-fg-brand" : "text-body hover:text-fg-brand"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-soft" : ""
                  }`}
                >
                  <AppIcon name={item.icon} size={20} />
                </span>
                <SlotLabel active={active}>{label}</SlotLabel>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
