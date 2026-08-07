import { useTranslation } from "react-i18next";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { AppIcon } from "../atoms/AppIcon";

/**
 * The assistant's global entry point.
 *
 * Rendered once by `AppShell`, so it is present on every authenticated route
 * rather than only on the assistant page. It is a launcher, not the assistant:
 * discreet, one control, no preview, nothing that competes with the page.
 *
 * Desktop and tablet only (`hidden md:inline-flex`), and that is the point
 * rather than an omission.
 *
 * Below `md` the bottom navigation already carries the assistant as its raised
 * centre action — the most prominent control on the screen. A floating button
 * as well would be two entry points to one destination on the smallest
 * viewport, and measurement showed the cost: lifted clear of the bar, the
 * launcher lands on top of the page's own cards and covers their text. The
 * requirement that this control never obscure content and never compete with
 * navigation is what decides it. Phones open the assistant from the bar (a
 * full-screen destination); wider screens, which have no bar, get this.
 *
 * It sits at the bottom-right inset, respecting `safe-area-inset-bottom` for
 * browsers that report one, on the `launcher` rung of the layer scale: above
 * page content, below every overlay it can open.
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
      className="glade-gradient fixed end-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-launcher hidden min-h-14 items-center gap-2.5 rounded-full px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-brand-soft md:inline-flex"
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
      <span>{label}</span>
    </button>
  );
}
