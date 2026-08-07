import { Alert, Badge, Spinner } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { allowedAssistantActions, assistantActionHref } from "../../api/assistantActions";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import { useAuth } from "../../auth/AuthContext";
import { useChatPanel, type AssistantRouteContext } from "../../chat/ChatPanelContext";
import { useAiHealth } from "../../hooks/useAiHealth";
import type { AssistantAction, AssistantResponse } from "../../types/bankruptcy";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";
import { AppIcon } from "../atoms/AppIcon";
import { AssistantCardView } from "../molecules/AssistantCardView";
import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";

interface ChatPanelProps {
  /** Seeds the composer — the assistant route passes `?prompt=` through here. */
  prefill?: string;
  /**
   * Where the user is, supplied by the global panel.
   *
   * Used to *show* the scope, not to widen it. Sending the section to the model
   * would need a new field on `bankruptcy.guide`, and that request shape is
   * owned by `contracts/api-contracts.json` plus the backend schema — a
   * coordinated contract change, not something a UI refactor may do quietly.
   * Displaying it already fixes the honesty problem the global panel creates:
   * opened from anywhere, the assistant otherwise gives no indication of what
   * it is and is not looking at.
   */
  routeContext?: AssistantRouteContext | null;
  /**
   * Whether this instance owns the surface's title.
   *
   * `"page"` (the default, used by `/assistant`) renders the full header: brand
   * tile, `h1`, case line, status badge.
   *
   * `"embedded"` is for a container that already has a titled header — today
   * `AiPanel`, whose sheet header carries the same "Asistente" title plus the
   * minimize and close controls. Rendering the full header inside it stacked
   * two headers on a phone, repeated the title twice in the accessibility tree,
   * and spent roughly 120px of a ~700px viewport on chrome before the first
   * message. The embedded form keeps what the sheet header does *not* say —
   * which case, which section, whether the model is reachable — on one line.
   */
  variant?: "page" | "embedded";
}

/**
 * The assistant conversation.
 *
 * It fills whatever container it is given (`h-full`), so the page shell decides
 * its size. It used to live inside a right-hand `Drawer` opened by a floating
 * button, which meant it had no URL: it could not be linked to, did not survive
 * a reload, and on a phone it was a second navigation surface competing with
 * the bottom bar. It now renders inside `AssistantPage` at `/assistant`, and
 * the close control is gone with the drawer — leaving a page is what browser
 * back is for.
 *
 * Three rows, and only the middle one scrolls: a header that pins the case and
 * the model behind it, the transcript, and the composer. Sizing the transcript
 * rather than the page is what keeps the composer where the user left it
 * instead of walking it down the screen as the conversation grows.
 */
export function ChatPanel({ prefill = "", routeContext = null, variant = "page" }: ChatPanelProps) {
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const navigate = useNavigate();
  const { caseData } = useChatPanel();
  const aiHealth = useAiHealth();
  const [message, setMessage] = useState(prefill);
  const [guidance, setGuidance] = useState<AssistantResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const messages = caseData?.messages ?? [];

  // Section cards link here with the question already written (`?prompt=`).
  useEffect(() => {
    if (prefill) setMessage(prefill);
  }, [prefill]);

  // Pin to the newest message.
  useEffect(() => {
    const transcript = transcriptRef.current;
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  if (!user || !caseData) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-body">
        {t("chat.openCaseFirst")}
      </div>
    );
  }

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessage("");
    setError(null);
    setBusy(true);
    const userMessage = { id: `message-${crypto.randomUUID()}`, role: "user" as const, content: trimmed, createdAt: new Date().toISOString() };
    workspace.updateCase(caseData.id, (current) => ({ ...current, messages: [...current.messages, userMessage] }));
    try {
      const response = await bankruptcyApi.guide(caseData, trimmed, user.role);
      setGuidance(response);
      workspace.updateCase(caseData.id, (current) => ({
        ...current,
        messages: [...current.messages, { id: `message-${crypto.randomUUID()}`, role: "assistant", content: response.message, createdAt: new Date().toISOString() }],
      }));
      setLastFailedMessage(null);
    } catch {
      setError(t("chat.responseError"));
      setLastFailedMessage(trimmed);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(message);
  };

  const retry = () => {
    if (lastFailedMessage) void send(lastFailedMessage);
  };

  // Actions arrive from a model, so they are filtered before anything is
  // rendered — the backend drops unknown resources too, and neither side
  // should be the only guard (see api/assistantActions.ts).
  const actions = allowedAssistantActions(guidance?.actions ?? []);

  /**
   * `ask` puts the suggested follow-up in the composer for the user to send.
   * Navigation types route. No action type mutates the case: writes are phase 2
   * and require the signed server-side confirmation flow, so there is
   * deliberately no default branch that "does something" with an unrecognized
   * type.
   *
   * This is the single handler for every action the assistant offers. The panel
   * used to carry a second "open recommended section" button beside the
   * composer, which navigated to whichever action happened to be navigable —
   * the same destination one of the chips above it already went to, under a
   * label that named none of them.
   */
  const selectSuggestedAction = (action: AssistantAction) => {
    if (action.action_type === "ask") {
      setMessage(action.label);
      return;
    }
    const href = assistantActionHref(caseData.id, action);
    if (!href) return;
    navigate(href);
  };

  const aiReady = aiHealth.data?.available === true;
  const aiOffline = !aiHealth.loading && !aiReady;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Case first, then the section the user is on when there is one — opened
          from the global launcher, the assistant otherwise gives no indication
          of what it is scoped to. Both variants say this; only the page variant
          also names the surface, because only it owns the title. */}
      {variant === "page" ? (
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-default px-5 py-4 sm:px-6">
          <span className="glade-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <AppIcon name="chat" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-heading">{t("chat.title")}</h1>
            <p className="truncate text-xs text-body">
              {routeContext?.section
                ? t("chat.scopedToSection", { client: caseData.clientName, section: routeContext.section })
                : caseData.clientName}
            </p>
          </div>
          <Badge color={aiReady ? "success" : "warning"}>
            {aiReady ? `${t("chat.ready")} (${aiHealth.data?.model})` : t("chat.offline")}
          </Badge>
        </header>
      ) : (
        <div className="flex shrink-0 items-center gap-2 border-b border-default px-4 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-body">
            {routeContext?.section
              ? t("chat.scopedToSection", { client: caseData.clientName, section: routeContext.section })
              : caseData.clientName}
          </p>
          <Badge color={aiReady ? "success" : "warning"}>
            {aiReady ? t("chat.ready") : t("chat.offline")}
          </Badge>
        </div>
      )}

      <div
        ref={transcriptRef}
        // px-4 below `sm`: on a 320–390px phone the sheet is full-bleed, so
        // every horizontal pixel spent on panel padding comes out of the
        // bubble, which already gives up room to an avatar and a copy control.
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
      >
        {messages.length ? (
          messages.map((item) => <ChatBubble key={item.id} message={item} />)
        ) : (
          <p className="py-6 text-center text-sm text-body">{t("chat.emptyTranscript")}</p>
        )}

        {busy ? (
          <div className="flex items-center gap-2 text-xs text-body">
            <Spinner size="sm" /> {t("chat.writing")}
          </div>
        ) : null}

        {/* Cards and the degraded notice describe the answer immediately above
            them, so they belong in the transcript flow rather than pinned over
            the composer where they would outlive it. */}
        {guidance?.cards.length ? (
          <div className="space-y-2">
            {guidance.cards.map((card, index) => (
              <AssistantCardView key={`${card.card_type}-${index}`} card={card} />
            ))}
          </div>
        ) : null}

        {guidance?.degraded ? <Alert color="info">{t("chat.degradedAnswer")}</Alert> : null}

        {error ? (
          <Alert color="failure">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <button type="button" onClick={retry} className="font-medium underline underline-offset-2">
                {t("chat.retry")}
              </button>
            </div>
          </Alert>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-default px-4 py-3 sm:px-6 sm:py-4">
        {/* The offline state is a standing condition with a recovery action,
            not a property of the last answer, so it stays pinned with the
            composer instead of scrolling away inside the transcript. */}
        {aiOffline ? (
          <Alert color="warning" className="mb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("chat.serviceUnavailable")}</span>
              <button
                type="button"
                onClick={() => void aiHealth.refresh()}
                className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
              >
                <AppIcon name="refresh" size={14} />
                {t("chat.retryConnection")}
              </button>
            </div>
          </Alert>
        ) : null}

        <ChatComposer
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          busy={busy}
          suggestedActions={actions}
          onSelectAction={selectSuggestedAction}
        />

        {guidance ? <p className="mt-2 text-xs text-body">{guidance.disclaimer}</p> : null}
      </div>
    </div>
  );
}
