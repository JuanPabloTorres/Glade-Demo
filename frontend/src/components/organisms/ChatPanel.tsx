import { Alert, Badge, Spinner } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { allowedAssistantActions, assistantActionHref } from "../../api/assistantActions";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import { useAuth } from "../../auth/AuthContext";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { useAiHealth } from "../../hooks/useAiHealth";
import type { AssistantAction, AssistantResponse } from "../../types/bankruptcy";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";
import { AppIcon } from "../atoms/AppIcon";
import { AssistantCardView } from "../molecules/AssistantCardView";
import { AppModal, AppModalBody, AppModalFooterBar } from "../overlays/AppModal";
import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";

/**
 * The preparation assistant, as a centred dialog composed from the governed
 * modal shell (`overlays/AppModal`) rather than a right-edge Drawer.
 *
 * The Drawer was the wrong container for this content. It capped itself at
 * `sm:max-w-sm md:max-w-md`, so the assistant's cards — a two-column
 * definition list of case figures — were squeezed into ~380px on every screen
 * size, no matter how much room the display had; and below `sm` it took the
 * full width anyway, which is a modal with extra steps. A dialog that is
 * centred and free to use `2xl` gives the transcript and the cards the same
 * reading measure the rest of the workspace uses.
 *
 * `fillHeight` is what makes it usable as a conversation: without it the panel
 * hugs its content, so it would be short on the first turn and grow with every
 * answer, walking the composer down the screen while the user types into it.
 *
 * Everything the shell already owns — portal, focus trap, `role="dialog"`,
 * `aria-modal`, `aria-labelledby`, Escape, outside-click dismissal, background
 * scroll lock — is deliberately not reimplemented here.
 */
export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("ai");
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const navigate = useNavigate();
  const { caseData, prefill } = useChatPanel();
  const aiHealth = useAiHealth();
  const [message, setMessage] = useState(prefill);
  const [guidance, setGuidance] = useState<AssistantResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const messages = caseData?.messages ?? [];

  // Section cards open the assistant with the question already written
  // (CaseWorkspacePage passes it through `openChat`). Keyed on `open` as well
  // as `prefill` so entering the same section twice re-arms the same question:
  // keyed on `prefill` alone, the second visit changes nothing and the
  // composer stays empty.
  useEffect(() => {
    if (open && prefill) setMessage(prefill);
  }, [open, prefill]);

  // Pin to the newest message. `open` is a dependency because the body does
  // not exist while the dialog is closed — without it, reopening a
  // conversation would restore it scrolled to the top.
  useEffect(() => {
    if (!open) return;
    const transcript = transcriptRef.current;
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }, [open, messages.length, busy]);

  if (!user || !caseData) return null;

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
   * Navigation types route and close the dialog. No action type mutates the
   * case: writes are phase 2 and require the signed server-side confirmation
   * flow, so there is deliberately no default branch that "does something"
   * with an unrecognized type.
   *
   * This is the single handler for every action the assistant offers. The
   * dialog used to carry a second "open recommended section" button beside the
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
    onClose();
  };

  const aiReady = aiHealth.data?.available === true;
  const aiOffline = !aiHealth.loading && !aiReady;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("chat.title")}
      size="2xl"
      fillHeight
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate font-medium text-heading">{caseData.clientName}</span>
          <Badge color={aiReady ? "success" : "warning"}>
            {aiReady ? `${t("chat.ready")} (${aiHealth.data?.model})` : t("chat.offline")}
          </Badge>
        </span>
      }
    >
      <AppModalBody ref={transcriptRef}>
        <div className="space-y-4">
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

          {/* Cards and the degraded notice describe the answer immediately
              above them, so they belong in the transcript flow rather than
              pinned over the composer where they would outlive it. */}
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
      </AppModalBody>

      <AppModalFooterBar>
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
      </AppModalFooterBar>
    </AppModal>
  );
}
