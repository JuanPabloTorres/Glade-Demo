import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useState } from "react";
import { AppIcon } from "../atoms/AppIcon";
import { EVIDENCE_TYPES } from "../../config/bankruptcyOptions";
import type { BankruptcyCase, CaseAnalysis } from "../../types/bankruptcy";

type ActionKind =
  | "request-document"
  | "request-clarification"
  | "add-note"
  | "schedule-consultation"
  | "assign-attorney"
  | "generate-summary"
  | "message-client";

interface CaseActionBarProps {
  caseData: BankruptcyCase;
  analysis: CaseAnalysis | null;
  onUpdate: (updater: (value: BankruptcyCase) => BankruptcyCase) => void;
  onMarkUrgent: () => void;
  onOpenAttorneyReviewTab: () => void;
}

function timestampNote(label: string, body: string): string {
  return `[${new Date().toLocaleDateString("es-PR")}] ${label}: ${body}`;
}

function draftSummary(caseData: BankruptcyCase, analysis: CaseAnalysis | null): string {
  const lines = [
    `Resumen del caso — ${caseData.clientName}`,
    `Objetivo declarado: ${caseData.clientGoal || "No especificado"}`,
    `Hogar: ${caseData.household.householdSize} persona(s), ${caseData.household.dependents} dependiente(s), vivienda: ${caseData.household.housingStatus ?? "no especificada"}.`,
    `Ingreso neto mensual: ${analysis ? `$${analysis.monthly_net_income.toFixed(2)}` : "pendiente de análisis"}.`,
    `Gastos mensuales: ${analysis ? `$${analysis.monthly_expenses.toFixed(2)}` : "pendiente de análisis"}.`,
    `Flujo disponible: ${analysis ? `$${analysis.monthly_cash_flow.toFixed(2)}` : "pendiente de análisis"}.`,
    `Deuda total: ${analysis ? `$${analysis.total_debt.toFixed(2)}` : "pendiente de análisis"}.`,
    `Bienes: ${caseData.assets.length} registrado(s).`,
    `Urgencias: ${caseData.household.urgentCollectionAction ? "Sí — cobro urgente reportado." : "Ninguna reportada."}`,
    `Documentos recibidos: ${caseData.evidence.filter((item) => item.status !== "requested" && item.status !== "missing").length} de ${caseData.evidence.length} registrados.`,
    analysis?.warnings.length ? `Alertas: ${analysis.warnings.join("; ")}` : "Alertas: ninguna detectada.",
    "",
    "Preguntas para la consulta:",
    ...(analysis?.discussion_points.slice(0, 5).map((item) => `- ${item}`) ?? ["- Pendiente de análisis."]),
  ];
  return lines.join("\n");
}

/**
 * Attorney action bar per master instruction §15.2. Every action opens a
 * Flowbite Modal (or applies instantly for the single-click toggle) and
 * writes directly to the shared case record, so the client sees the effect
 * immediately (e.g. a requested document appears on their dashboard badge
 * added in Block 2).
 *
 * "Generar resumen" composes its draft from data already fetched via
 * /bankruptcy/analyze — it is explicitly labeled as a draft subject to
 * review, not a real LLM call. Block 9 will replace the composition with
 * the backend's structured AssistantResponse without changing this UI.
 */
export function CaseActionBar({ caseData, analysis, onUpdate, onMarkUrgent, onOpenAttorneyReviewTab }: CaseActionBarProps) {
  const [openAction, setOpenAction] = useState<ActionKind | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>(EVIDENCE_TYPES[0]);
  const [noteText, setNoteText] = useState("");
  const [consultationDate, setConsultationDate] = useState("");
  const [attorneyName, setAttorneyName] = useState(caseData.assignedAttorneyName ?? "");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => setOpenAction(null);

  const appendNote = (text: string) =>
    onUpdate((current) => ({ ...current, attorneyNotes: [current.attorneyNotes, text].filter(Boolean).join("\n") }));

  const submitRequestDocument = () => {
    onUpdate((current) => ({
      ...current,
      evidence: [
        ...current.evidence,
        { id: `evidence-${crypto.randomUUID()}`, evidenceType, name: evidenceType, status: "requested", relatedEntryIds: [] },
      ],
    }));
    close();
  };

  const submitRequestClarification = () => {
    if (!noteText.trim()) return;
    appendNote(timestampNote("Aclaración solicitada al cliente", noteText.trim()));
    setNoteText("");
    close();
  };

  const submitAddNote = () => {
    if (!noteText.trim()) return;
    appendNote(timestampNote("Nota profesional", noteText.trim()));
    setNoteText("");
    close();
  };

  const submitScheduleConsultation = () => {
    onUpdate((current) => ({
      ...current,
      status: "consultation_scheduled",
      timeline: [
        ...current.timeline,
        {
          id: `timeline-${crypto.randomUUID()}`,
          stage: "consultation_scheduled",
          title: "Consulta programada",
          description: consultationDate ? `Consulta programada para el ${consultationDate}.` : "Consulta programada.",
          status: "current",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setConsultationDate("");
    close();
  };

  const submitAssignAttorney = () => {
    onUpdate((current) => ({ ...current, assignedAttorneyName: attorneyName.trim() || undefined }));
    close();
  };

  const submitMessageClient = () => {
    if (!clientMessage.trim()) return;
    onUpdate((current) => ({
      ...current,
      messages: [
        ...current.messages,
        { id: `message-${crypto.randomUUID()}`, role: "assistant", content: clientMessage.trim(), createdAt: new Date().toISOString() },
      ],
    }));
    setClientMessage("");
    close();
  };

  const actions: { kind: ActionKind; label: string; icon: Parameters<typeof AppIcon>[0]["name"]; onClick: () => void }[] = [
    { kind: "request-document", label: "Solicitar documento", icon: "evidence", onClick: () => setOpenAction("request-document") },
    { kind: "request-clarification", label: "Solicitar aclaración", icon: "chat", onClick: () => setOpenAction("request-clarification") },
    { kind: "add-note", label: "Añadir nota", icon: "document", onClick: () => setOpenAction("add-note") },
    { kind: "schedule-consultation", label: "Programar consulta", icon: "timeline", onClick: () => setOpenAction("schedule-consultation") },
    { kind: "assign-attorney", label: "Asignar abogado", icon: "attorney", onClick: () => setOpenAction("assign-attorney") },
    { kind: "generate-summary", label: "Generar resumen", icon: "calculator", onClick: () => { setSummaryDraft(draftSummary(caseData, analysis)); setOpenAction("generate-summary"); } },
    { kind: "message-client", label: "Enviar mensaje al cliente", icon: "chat", onClick: () => setOpenAction("message-client") },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.kind} size="xs" color="light" onClick={action.onClick}>
            <AppIcon name={action.icon} size={15} className="mr-1.5" /> {action.label}
          </Button>
        ))}
        <Button size="xs" color={caseData.household.urgentCollectionAction ? "failure" : "light"} onClick={onMarkUrgent}>
          <AppIcon name="alert" size={15} className="mr-1.5" /> {caseData.household.urgentCollectionAction ? "Quitar urgencia" : "Marcar urgente"}
        </Button>
        <Button size="xs" color="light" onClick={onOpenAttorneyReviewTab}>
          <AppIcon name="check" size={15} className="mr-1.5" /> Cambiar estado
        </Button>
      </div>

      <Modal show={openAction === "request-document"} onClose={close}>
        <ModalHeader>Solicitar documento</ModalHeader>
        <ModalBody>
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">El documento aparecerá como pendiente en el expediente del cliente.</p>
          <Label htmlFor="request-evidence-type">Tipo de documento</Label>
          <Select id="request-evidence-type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
            {EVIDENCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}><AppIcon name="arrow-right" size={15} className="mr-2 rotate-180" />Cancelar</Button>
          <Button className="primary-action" onClick={submitRequestDocument}><AppIcon name="check" size={15} className="mr-2" />Solicitar</Button>
        </ModalFooter>
      </Modal>

      <Modal show={openAction === "request-clarification" || openAction === "add-note"} onClose={close}>
        <ModalHeader>{openAction === "request-clarification" ? "Solicitar aclaración" : "Añadir nota"}</ModalHeader>
        <ModalBody>
          <Label htmlFor="note-text" className="sr-only">Texto</Label>
          <Textarea id="note-text" rows={5} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={openAction === "request-clarification" ? "¿Qué necesitas que el cliente aclare?" : "Nota profesional para el expediente."} />
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}>Cancelar</Button>
          <Button className="primary-action" onClick={openAction === "request-clarification" ? submitRequestClarification : submitAddNote} disabled={!noteText.trim()}>
            <AppIcon name="check" size={15} className="mr-2" />Guardar
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={openAction === "schedule-consultation"} onClose={close}>
        <ModalHeader>Programar consulta</ModalHeader>
        <ModalBody>
          <Label htmlFor="consultation-date">Fecha propuesta</Label>
          <TextInput id="consultation-date" type="date" value={consultationDate} onChange={(event) => setConsultationDate(event.target.value)} />
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}>Cancelar</Button>
          <Button className="primary-action" onClick={submitScheduleConsultation}><AppIcon name="check" size={15} className="mr-2" />Programar</Button>
        </ModalFooter>
      </Modal>

      <Modal show={openAction === "assign-attorney"} onClose={close}>
        <ModalHeader>Asignar abogado</ModalHeader>
        <ModalBody>
          <Label htmlFor="assign-attorney-name">Nombre del abogado</Label>
          <TextInput id="assign-attorney-name" value={attorneyName} onChange={(event) => setAttorneyName(event.target.value)} placeholder="Ej. Lcda. Ana Martínez" />
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}>Cancelar</Button>
          <Button className="primary-action" onClick={submitAssignAttorney}><AppIcon name="check" size={15} className="mr-2" />Asignar</Button>
        </ModalFooter>
      </Modal>

      <Modal show={openAction === "generate-summary"} onClose={close} size="2xl">
        <ModalHeader>Resumen del caso (borrador)</ModalHeader>
        <ModalBody>
          <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">Borrador generado a partir del expediente — sujeto a revisión profesional. No constituye asesoramiento legal.</p>
          <Textarea rows={14} value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} className="font-mono text-xs" />
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}>Cerrar</Button>
          <Button
            className="primary-action"
            onClick={() => {
              appendNote(timestampNote("Resumen generado", summaryDraft));
              close();
            }}
          >
            <AppIcon name="check" size={15} className="mr-2" />Guardar en notas
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={openAction === "message-client"} onClose={close}>
        <ModalHeader>Enviar mensaje al cliente</ModalHeader>
        <ModalBody>
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">El mensaje aparecerá en el chat de "Guía inteligente" que ve el cliente.</p>
          <Label htmlFor="client-message" className="sr-only">Mensaje</Label>
          <Textarea id="client-message" rows={4} value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} />
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={close}>Cancelar</Button>
          <Button className="primary-action" disabled={busy || !clientMessage.trim()} onClick={() => { setBusy(true); submitMessageClient(); setBusy(false); }}>
            <AppIcon name="chat" size={15} className="mr-2" />Enviar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
