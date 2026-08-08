import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { IconButton } from "../ui/IconButton";
import { ChatPanel } from "../organisms/ChatPanel";

/**
 * The assistant as a global surface, available from any authenticated route.
 *
 * Two shapes, one component, chosen by breakpoint rather than by a JS width
 * check so there is no resize flicker and no second source of truth:
 *
 * - below `md` it takes the whole viewport. Not a partial sheet: a phone has
 *   nothing to spare, and a conversation squeezed into the bottom two thirds of
 *   a 320px screen shows about three lines of an answer. It sits above the
 *   bottom bar and outside the page's content column entirely — `fixed inset-0`
 *   with the safe areas as padding, so the header and composer clear the notch
 *   and the home indicator while the surface itself still reaches the edges;
 * - from `md` up it is a right-hand side panel of fixed width. It deliberately
 *   does not cover the page: no scrim, and the sidebar and header stay visible
 *   and usable, so the assistant can be read against the screen it is about.
 *
 * State lives in `ChatPanelContext`, and the panel stays mounted while
 * minimized — only its body is hidden. That is what preserves the composer
 * draft and the last answer's cards across a minimize/restore; unmounting
 * would silently discard them. The transcript itself is case state and lives
 * in the workspace, so it survives regardless.
 *
 * This is now the assistant's only surface. `/assistant` used to render the
 * same `ChatPanel` as a page, which meant two ways in that behaved differently
 * — one navigated away from what you were asking about, the other did not. The
 * route redirects here instead, carrying its `?prompt=` through, so nothing
 * that linked to it breaks.
 */
export function AiPanel() {
  const { t } = useTranslation(["ai", "common"]);
  const { status, minimizePanel, closePanel, panelPrefill, caseData, routeContext } = useChatPanel();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = "ai-panel-title";

  // Escape minimizes rather than closes: the less destructive of the two, and
  // the conversation is one tap away again.
  useEffect(() => {
    if (status !== "open") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") minimizePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [status, minimizePanel]);

  useEffect(() => {
    if (status === "open") panelRef.current?.focus();
  }, [status]);

  if (status === "closed") return null;

  const open = status === "open";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={headingId}
      aria-label={t("ai:chat.title")}
      tabIndex={-1}
      // `hidden` while minimized keeps the subtree mounted (state preserved)
      // and out of the accessibility tree and the tab order at the same time.
      hidden={!open}
      className="fixed z-drawer flex flex-col overflow-hidden border-default bg-neutral-primary-soft shadow-[0_-8px_40px_rgba(15,23,42,0.22)] outline-none
        inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:w-104 md:p-0 md:border-s md:shadow-[-8px_0_40px_rgba(15,23,42,0.16)]"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-default px-4 py-3">
        <h2 id={headingId} className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
          {t("ai:chat.title")}
        </h2>

        <IconButton
          onClick={minimizePanel}
          icon="collapse-left"
          iconClassName="-rotate-90"
          label={t("ai:launcher.minimize")}
          title={t("ai:launcher.minimize")}
        />
        <IconButton
          onClick={closePanel}
          icon="close"
          label={t("common:actions.close")}
          title={t("common:actions.close")}
        />
      </div>

      <div className="min-h-0 flex-1">
        {/*
          `key` on the case, not on the route: the conversation must survive
          navigating between sections of the same case, and must reset when the
          attorney switches to a different one. `routeContext` is what tells the
          assistant which section the user is looking at.
        */}
        <ChatPanel
          key={caseData?.id ?? "no-case"}
          prefill={panelPrefill}
          routeContext={routeContext}
          // This sheet already has a header carrying the same title and the
          // window controls; the page variant stacked a second one under it.
          variant="embedded"
        />
      </div>
    </div>
  );
}
