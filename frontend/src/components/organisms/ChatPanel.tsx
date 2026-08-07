import { Alert, Badge, Modal, ModalBody, ModalHeader, Spinner, Tooltip } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import { useAuth } from "../../auth/AuthContext";
import { useChatPanel } from "../../chat/ChatPanelContext";
import { FOCUS_PARAM_TO_SECTION, ROUTES } from "../../config/routes";
import { useAiHealth } from "../../hooks/useAiHealth";
import type { AssistantAction, AssistantResponse } from "../../types/bankruptcy";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";
import { AppIcon } from "../atoms/AppIcon";
import { AppButton } from "../ui/AppButton";
import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";

interface ChatPanelProps {
  /** Seeds the composer — the assistant route passes `?prompt=` through here. */
  prefill?: string;
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
 */
export function ChatPanel({ prefill = "" }: ChatPanelProps) {
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

  // The backend answers with its own `focus_section` vocabulary; translate it
  // to the canonical section path rather than emitting the legacy `?focus=`
  // form the workspace would only have to redirect away from.
  const openFocusSection = () => {
    const section = guidance?.focus_section ? FOCUS_PARAM_TO_SECTION[guidance.focus_section] : undefined;
    if (!section) return;
    navigate(ROUTES.caseSection(caseData.id, section));
  };

  // Every suggested_actions entry emitted by the backend today has
  // action_type "ask" (a follow-up prompt to send verbatim) — see
  // backend/app/schemas/assistant.py for why that type exists. Other
  // action_types (request_document, create_note, ...) have no handler yet.
  const selectSuggestedAction = (action: AssistantAction) => setMessage(action.label);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-default p-4">
        <span className="glade-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <AppIcon name="assistant" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-heading">{t("chat.title")}</h1>
          <p className="truncate text-xs text-body">{caseData.clientName}</p>
        </div>
        <Badge color={aiHealth.data?.available ? "success" : "warning"} className="hidden sm:inline-flex">
          {aiHealth.data?.available ? `${t("chat.ready")} (${aiHealth.data.model})` : t("chat.offline")}
        </Badge>
        <Tooltip content={t("chat.uploadDocument")}>
          <button
            type="button"
            aria-label={t("chat.uploadDocument")}
            onClick={() => setUploadNoticeOpen(true)}
            className="rounded-lg p-2 text-body hover:bg-neutral-secondary-medium"
          >
            <AppIcon name="document" size={18} />
          </button>
        </Tooltip>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {caseData.messages.map((item) => <ChatBubble key={item.id} message={item} />)}
        {busy ? (
          <div className="flex items-center gap-2 text-xs text-body"><Spinner size="sm" /> {t("chat.writing")}</div>
        ) : null}
      </div>

      {error ? (
        <div className="px-4">
          <Alert color="failure" className="mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <span>{t("chat.serviceUnavailable")}</span>
              <div>
                <AppButton size="xs" color="light" onClick={() => void aiHealth.refresh()}>{t("chat.retryConnection")}</AppButton>
              </div>
            </div>
          </Alert>
        </div>
      ) : null}

      {guidance?.focus_section ? (
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
          suggestedActions={guidance?.suggested_actions ?? []}
          onSelectAction={selectSuggestedAction}
        />
        {guidance ? <p className="mt-2 text-xs text-body">{guidance.disclaimer}</p> : null}
      </div>

      <Modal show={uploadNoticeOpen} onClose={() => setUploadNoticeOpen(false)}>
        <ModalHeader>{t("chat.uploadTitle")}</ModalHeader>
        <ModalBody>
          <Badge color="gray" className="mb-3 w-fit">{t("chat.comingSoon")}</Badge>
          <p className="text-sm leading-6 text-body">{t("chat.uploadHint")}</p>
        </ModalBody>
      </Modal>
    </div>
  );
}
