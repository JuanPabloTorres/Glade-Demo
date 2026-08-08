import { useTranslation } from "react-i18next";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { AppIcon } from "../atoms/AppIcon";

/**
 * The assistant's entry point — the only one, on every breakpoint.
 *
 * Rendered once by `AppShell`, so it is present on every authenticated route.
 *
 * It used to be one of three: a sidebar entry and a raised bottom-bar slot both
 * navigated to `/assistant`, while this button opened a panel over the current
 * page. Two surfaces, three controls, and no way for a user to tell which of
 * them they were about to get. The sidebar entry and the bar slot are gone;
 * `/assistant` still resolves and redirects here, so old links keep working.
 *
 * It was also desktop-only, because lifted clear of the bottom bar it landed on
 * top of the page's own cards. It is on phones now — the bar no longer carries
 * the assistant, so this is the only way in there too — and the offset below is
 * what keeps it off both the bar and the content: it clears the bar's height
 * (4.5rem) plus its gutter and the device's safe-area inset, and drops back to
 * a plain inset at `md` where the bar does not render.
 *
 * Below `sm` it is the mark alone. A pill wide enough for "Abrir asistente"
 * spans a third of a 320px viewport and covers whatever sits under it; the
 * label is still the button's accessible name and its tooltip.
 *
 * It hides itself while the panel is open — two controls for one thing, one of
 * them underneath the other, is not a choice worth offering. Minimized is
 * different: the launcher comes back and carries a dot, because that is the
 * affordance that brings the conversation back.
 */
export function AiLauncher() {
  const { t } = useTranslation(["ai", "navigation"]);
  const { status, openPanel } = useChatPanel();

  // Present on every authenticated route, including the attorney's inbox where
  // no case is open yet. An earlier version hid it whenever the assistant had
  // no case to reason about, which made a global control appear and disappear
  // as the user moved around — harder to learn than one that is always in the
  // same place and says plainly what it needs. The panel itself explains the
  // missing case (see ChatPanel's `chat.openCaseFirst`).
  if (status === "open") return null;

  const minimized = status === "minimized";
  const label = minimized ? t("ai:launcher.resume") : t("ai:launcher.open");

  return (
    <button
      type="button"
      onClick={() => openPanel()}
      aria-label={label}
      title={label}
      className="glade-gradient fixed end-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-launcher inline-flex min-h-14 min-w-14 items-center justify-center gap-2.5 rounded-full px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-brand-soft md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <AppIcon name="assistant" size={22} />
        {minimized ? (
          <span
            aria-hidden="true"
            className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-indigo-500"
          />
        ) : null}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
