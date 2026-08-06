import { Alert, Badge, Button, Modal, ModalBody, ModalHeader, Spinner, Tooltip } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import { useAuth } from "../../auth/AuthContext";
import { useChatPanel } from "../../chat/ChatPanelContext";
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
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const navigate = useNavigate();
  const { caseData, prefill } = useChatPanel();
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
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
        Abre un expediente para conversar con el asistente.
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
      setError("El asistente no respondió. Intenta de nuevo en un momento.");
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
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-4">
        <span className="glade-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"><AppIcon name="chat" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[var(--color-text)]">Asistente de preparación</h2>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{caseData.clientName}</p>
        </div>
        <Tooltip content="Subir documento">
          <button type="button" aria-label="Subir documento" onClick={() => setUploadNoticeOpen(true)} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
            <AppIcon name="document" size={18} />
          </button>
        </Tooltip>
        <Tooltip content="Cerrar">
          <button type="button" aria-label="Cerrar chat" onClick={onClose} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
            <AppIcon name="arrow-right" size={18} />
          </button>
        </Tooltip>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {caseData.messages.map((item) => <ChatBubble key={item.id} message={item} />)}
        {busy ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><Spinner size="sm" /> El asistente está escribiendo…</div>
        ) : null}
      </div>

      {error ? (
        <div className="px-4">
          <Alert color="failure" className="mb-3">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="xs" color="light" onClick={retry}>Reintentar</Button>
            </div>
          </Alert>
        </div>
      ) : null}

      {guidance?.focus_section ? (
        <div className="px-4 pb-2">
          <Button size="xs" color="light" onClick={openFocusSection}>
            <AppIcon name="arrow-right" size={14} className="mr-1.5" /> Abrir sección recomendada
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
        <ModalHeader>Subir documento</ModalHeader>
        <ModalBody>
          <Badge color="gray" className="mb-3 w-fit">Próximamente</Badge>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            La carga de documentos reales desde el chat llega en una fase posterior del proyecto (pipeline de
            documentos). Por ahora, registra la evidencia como metadato en la sección "Documentos" del expediente.
          </p>
        </ModalBody>
      </Modal>
    </div>
  );
}
