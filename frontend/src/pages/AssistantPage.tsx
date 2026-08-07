import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ChatPanel } from "../components/organisms/ChatPanel";
import { ASSISTANT_PROMPT_PARAM } from "../config/routes";

/**
 * The AI assistant as a destination.
 *
 * It is the product's primary capability, so it has a route of its own rather
 * than living behind a floating button and a drawer. That gives it everything a
 * drawer could not: a URL to link to and bookmark, survival across a reload,
 * and a place in browser back/forward. It is also what lets the bottom bar's
 * centre action and the sidebar's assistant entry point at the same
 * destination, instead of one navigating and the other toggling hidden state.
 *
 * The conversation is pinned to the viewport height minus the shell's chrome so
 * the message list scrolls inside it and the composer stays put, rather than
 * the page growing and pushing the input below the fold. `svh` rather than `vh`
 * because mobile browsers shrink the visual viewport when their toolbars are
 * shown, and `vh` would leave the composer under them.
 *
 * A plain section carries `.app-card` instead of Flowbite's `Card`: `Card`
 * owns its inner padding, and this surface needs its header and composer flush
 * against the edges with only the message list padded.
 */
export function AssistantPage() {
  const { t } = useTranslation(["ai"]);
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get(ASSISTANT_PROMPT_PARAM) ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="app-card h-[calc(100svh-15rem)] min-h-96 overflow-hidden">
        <ChatPanel prefill={prefill} />
      </section>
      <p className="mt-3 px-1 text-xs leading-5 text-body">{t("ai:chat.pageDisclaimer")}</p>
    </div>
  );
}
