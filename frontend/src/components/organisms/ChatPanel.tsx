import { Alert, Badge, Button, Modal, ModalBody, ModalHeader, Spinner, Tooltip } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import { useAuth } from "../../auth/AuthContext";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { useAiHealth } from "../../hooks/useAiHealth";
import type { AssistantAction, AssistantResponse } from "../../types/bankruptcy";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";
import { AppIcon } from "../atoms/AppIcon";
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

  const openFocusSection = () => {
    if (!guidance?.focus_section) return;
    navigate(`/case/${caseData.id}?focus=${encodeURIComponent(guidance.focus_section)}`);
    onClose();
  };

  // Every suggested_actions entry emitted by the backend today has
  // action_type "ask" (a follow-up prompt to send verbatim) — see
  // backend/app/schemas/assistant.py for why that type exists. Other
  // action_types (request_document, create_note, ...) have no handler yet;
  // Block 10 wires those up as real case-mutating actions.
  const selectSuggestedAction = (action: AssistantAction) => setMessage(action.label);

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
              <Button size="xs" color="light" onClick={retry}>{t("chat.retry")}</Button>
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
                <Button size="xs" color="light" onClick={() => void aiHealth.refresh()}>{t("chat.retryConnection")}</Button>
              </div>
            </div>
          </Alert>
        </div>
      ) : null}

      {guidance?.focus_section ? (
        <div className="px-4 pb-2">
          <Button size="xs" color="light" onClick={openFocusSection}>
            <AppIcon name="arrow-right" size={14} className="mr-1.5" /> {t("chat.openRecommendedSection")}
          </Button>
        </div>
      ) : null}

      <div className="p-4 pt-0">
        <ChatComposer
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          busy={busy}
          suggestedActions={guidance?.suggested_actions ?? []}
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
