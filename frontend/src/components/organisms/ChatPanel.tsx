import { Alert, Badge, Modal, ModalBody, ModalHeader, Spinner, Tooltip } from "flowbite-react";
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
import { AppButton } from "../ui/AppButton";
import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";

/**
 * The chat, as a real component instead of raw inline markup — master
 * instruction §16. Rendered once inside AppShell's Drawer (see AppShell.tsx)
 * so it is reachable from anywhere behind auth, per §6.1, rather than a
 * workspace tab.
 */
export function ChatPanel({ onClose }: { onClose: () => void }) {
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
  const [uploadNoticeOpen, setUploadNoticeOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill) setMessage(prefill);
  }, [prefill]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [caseData?.messages.length, busy]);

  if (!user || !caseData) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-(--color-text-muted)">
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
  const navigableAction = actions.find(
    (action) => action.action_type === "open_page" || action.action_type === "show_details",
  );

  const openFocusSection = () => {
    if (!navigableAction) return;
    const href = assistantActionHref(caseData.id, navigableAction);
    if (!href) return;
    navigate(href);
    onClose();
  };

  /**
   * `ask` puts the suggested follow-up in the composer for the user to send.
   * Navigation types route. No action type mutates the case: writes are
   * phase 2 and require the signed server-side confirmation flow, so there
   * is deliberately no default branch that "does something" with an
   * unrecognized type.
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-(--color-border) p-4">
        <span className="glade-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"><AppIcon name="chat" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-(--color-text)">{t("chat.title")}</h2>
          <p className="truncate text-xs text-(--color-text-muted)">{caseData.clientName}</p>
        </div>
        <Badge color={aiHealth.data?.available ? "success" : "warning"} className="hidden sm:inline-flex">
          {aiHealth.data?.available ? `${t("chat.ready")} (${aiHealth.data.model})` : t("chat.offline")}
        </Badge>
        <Tooltip content={t("chat.uploadDocument")}>
          <button type="button" aria-label={t("chat.uploadDocument")} onClick={() => setUploadNoticeOpen(true)} className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface-muted)">
            <AppIcon name="document" size={18} />
          </button>
        </Tooltip>
        <Tooltip content={t("chat.close")}>
          <button type="button" aria-label={t("chat.close")} onClick={onClose} className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface-muted)">
            <AppIcon name="arrow-right" size={18} />
          </button>
        </Tooltip>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {caseData.messages.map((item) => <ChatBubble key={item.id} message={item} />)}
        {busy ? (
          <div className="flex items-center gap-2 text-xs text-(--color-text-muted)"><Spinner size="sm" /> {t("chat.writing")}</div>
        ) : null}
      </div>

      {error ? (
        <div className="px-4">
          <Alert color="failure" className="mb-3">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <AppButton size="xs" color="light" onClick={retry}>{t("chat.retry")}</AppButton>
            </div>
          </Alert>
        </div>
      ) : null}

      {!aiHealth.loading && !aiHealth.data?.available ? (
        <div className="px-4">
          <Alert color="warning" className="mb-3">
            <div className="flex flex-col gap-2">
              <span>
                {t("chat.serviceUnavailable")}
              </span>
              <div>
                <AppButton size="xs" color="light" onClick={() => void aiHealth.refresh()}>{t("chat.retryConnection")}</AppButton>
              </div>
            </div>
          </Alert>
        </div>
      ) : null}

      {guidance?.cards.length ? (
        <div className="space-y-2 px-4 pb-2">
          {guidance.cards.map((card, index) => (
            <AssistantCardView key={`${card.card_type}-${index}`} card={card} />
          ))}
        </div>
      ) : null}

      {guidance?.degraded ? (
        <div className="px-4 pb-2">
          <Alert color="info">{t("chat.degradedAnswer")}</Alert>
        </div>
      ) : null}

      {navigableAction ? (
        <div className="px-4 pb-2">
          <AppButton size="xs" color="light" onClick={openFocusSection}>
            <AppIcon name="arrow-right" size={14} className="mr-1.5" /> {t("chat.openRecommendedSection")}
          </AppButton>
        </div>
      ) : null}

      <div className="p-4 pt-0">
        <ChatComposer
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          busy={busy}
          suggestedActions={actions}
          onSelectAction={selectSuggestedAction}
        />
        {guidance ? <p className="mt-2 text-xs text-[#777]">{guidance.disclaimer}</p> : null}
      </div>

      <Modal show={uploadNoticeOpen} onClose={() => setUploadNoticeOpen(false)}>
        <ModalHeader>{t("chat.uploadTitle")}</ModalHeader>
        <ModalBody>
          <Badge color="gray" className="mb-3 w-fit">{t("chat.comingSoon")}</Badge>
          <p className="text-sm leading-6 text-(--color-text-muted)">
            {t("chat.uploadHint")}
          </p>
        </ModalBody>
      </Modal>
    </div>
  );
}
