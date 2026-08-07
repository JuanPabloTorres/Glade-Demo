import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";
import { ActionGroup } from "../ui/ActionGroup";
import { AppButton } from "../ui/AppButton";
import { AppModal, AppModalBody, AppModalFooter } from "../overlays/AppModal";
import { SelectField, TextField, TextareaField } from "../forms/fields";
import { EVIDENCE_TYPES } from "../../config/bankruptcyOptions";
import type { BankruptcyCase, CaseAnalysis } from "../../types/bankruptcy";
import { formatDate } from "../../i18n/format";

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
  return `[${formatDate(new Date())}] ${label}: ${body}`;
}

/**
 * Composes the attorney's draft summary through `t()`.
 *
 * Every line of this document used to be a hardcoded Spanish template literal,
 * so an English session opened "Generate summary" and got a Spanish document —
 * one of the clearest cases of the mixed-language symptom, and invisible to the
 * locale-file parity check because none of the text lived in a locale file.
 * The `t` function is passed in rather than read from a hook so this stays a
 * pure function and can be unit-tested against both languages.
 */
function draftSummary(t: TFunction, caseData: BankruptcyCase, analysis: CaseAnalysis | null): string {
  const pending = t("workspace:actionBar.summary.pendingAnalysis");
  const money = (value: number | undefined) => (analysis && value !== undefined ? `$${value.toFixed(2)}` : pending);
  const received = caseData.evidence.filter((item) => item.status !== "requested" && item.status !== "missing").length;

  return [
    t("workspace:actionBar.summary.lines.heading", { client: caseData.clientName }),
    t("workspace:actionBar.summary.lines.goal", { goal: caseData.clientGoal || t("workspace:actionBar.summary.notSpecified") }),
    t("workspace:actionBar.summary.lines.household", {
      size: caseData.household.householdSize,
      dependents: caseData.household.dependents,
      housing: caseData.household.housingStatus ?? t("workspace:actionBar.summary.notSpecified"),
    }),
    t("workspace:actionBar.summary.lines.netIncome", { amount: money(analysis?.monthly_net_income) }),
    t("workspace:actionBar.summary.lines.expenses", { amount: money(analysis?.monthly_expenses) }),
    t("workspace:actionBar.summary.lines.cashFlow", { amount: money(analysis?.monthly_cash_flow) }),
    t("workspace:actionBar.summary.lines.totalDebt", { amount: money(analysis?.total_debt) }),
    t("workspace:actionBar.summary.lines.assets", { count: caseData.assets.length }),
    t("workspace:actionBar.summary.lines.urgency", {
      detail: caseData.household.urgentCollectionAction
        ? t("workspace:actionBar.summary.urgencyReported")
        : t("workspace:actionBar.summary.urgencyNone"),
    }),
    t("workspace:actionBar.summary.lines.documents", { received, total: caseData.evidence.length }),
    analysis?.warnings.length
      ? t("workspace:actionBar.summary.lines.warnings", { warnings: analysis.warnings.join("; ") })
      : t("workspace:actionBar.summary.lines.warningsNone"),
    "",
    t("workspace:actionBar.summary.lines.questionsHeading"),
    ...(analysis?.discussion_points.slice(0, 5).map((item) => `- ${item}`) ?? [`- ${pending}`]),
  ].join("\n");
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
  const { t } = useTranslation(["workspace", "common"]);
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
        // No file exists yet — leave name blank rather than the raw
        // evidenceType slug; CaseWorkspacePage falls back to a translated
        // "pending upload" placeholder when name is empty.
        { id: `evidence-${crypto.randomUUID()}`, evidenceType, name: "", status: "requested", relatedEntryIds: [] },
      ],
    }));
    close();
  };

  const submitRequestClarification = () => {
    if (!noteText.trim()) return;
    appendNote(timestampNote(t("workspace:actionBar.notes.clarificationRequested"), noteText.trim()));
    setNoteText("");
    close();
  };

  const submitAddNote = () => {
    if (!noteText.trim()) return;
    appendNote(timestampNote(t("workspace:actionBar.notes.professionalNote"), noteText.trim()));
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
          // Was the hardcoded Spanish "Consulta programada" — it reached the
          // case timeline, which both roles read, in either language.
          title: t("workspace:actionBar.timeline.consultationScheduled"),
          description: consultationDate
            ? t("workspace:actionBar.timeline.consultationScheduledFor", { date: consultationDate })
            : t("workspace:actionBar.timeline.consultationScheduled"),
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
    { kind: "request-document", label: t("workspace:actions.requestDocument"), icon: "evidence", onClick: () => setOpenAction("request-document") },
    { kind: "request-clarification", label: t("workspace:actions.requestClarification"), icon: "chat", onClick: () => setOpenAction("request-clarification") },
    { kind: "add-note", label: t("workspace:actions.addNote"), icon: "document", onClick: () => setOpenAction("add-note") },
    { kind: "schedule-consultation", label: t("workspace:actions.scheduleConsultation"), icon: "timeline", onClick: () => setOpenAction("schedule-consultation") },
    { kind: "assign-attorney", label: t("workspace:actions.assignAttorney"), icon: "attorney", onClick: () => setOpenAction("assign-attorney") },
    { kind: "generate-summary", label: t("workspace:actions.generateSummary"), icon: "calculator", onClick: () => { setSummaryDraft(draftSummary(t, caseData, analysis)); setOpenAction("generate-summary"); } },
    { kind: "message-client", label: t("workspace:actions.messageClient"), icon: "chat", onClick: () => setOpenAction("message-client") },
  ];

  return (
    <>
      {/*
        Nine equal buttons used to wrap here into three ragged rows on a laptop
        and a column of full-width blocks on a phone, with no indication which
        one an attorney actually reaches for. Requesting a document is that
        action, so it is the only one that keeps a click of its own; the rest
        move behind the menu, which is portaled and so is not clipped by the
        card this bar sits in.
      */}
      <ActionGroup
        align="start"
        primary={{
          id: "request-document",
          label: t("workspace:actions.requestDocument"),
          icon: "evidence",
          onClick: () => setOpenAction("request-document"),
        }}
        actions={[
          ...actions
            .filter((action) => action.kind !== "request-document")
            .map((action) => ({
              id: action.kind,
              label: action.label,
              icon: action.icon,
              onClick: action.onClick,
            })),
          {
            id: "urgency",
            label: caseData.household.urgentCollectionAction
              ? t("workspace:actions.removeUrgency")
              : t("workspace:actions.markUrgent"),
            icon: "alert" as const,
            onClick: onMarkUrgent,
          },
          {
            id: "change-status",
            label: t("workspace:actions.changeStatus"),
            icon: "check" as const,
            onClick: onOpenAttorneyReviewTab,
          },
        ]}
      />

      {/* Every action below composes the shared AppModal. They previously
          repeated Flowbite's dialog markup with `flex items-center` footers, so
          their two actions shared one unwrapped row and were squeezed on a
          phone — the same defect fixed in Add Evidence, and fixed here by the
          same primitives rather than by a second set of patches. */}
      <AppModal
        open={openAction === "request-document"}
        onClose={close}
        title={t("workspace:actionBar.requestDocument.title")}
        description={t("workspace:actionBar.requestDocument.description")}
        size="lg"
      >
        <AppModalBody>
          <SelectField
            id="request-evidence-type"
            label={t("workspace:actionBar.requestDocument.documentType")}
            value={evidenceType}
            onChange={(event) => setEvidenceType(event.target.value)}
          >
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`workspace:entryModal.evidenceTypes.${type}`)}
              </option>
            ))}
          </SelectField>
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton className="primary-action w-full sm:w-auto" iconLeft="check" onClick={submitRequestDocument}>
            {t("workspace:actionBar.requestDocument.submit")}
          </AppButton>
        </AppModalFooter>
      </AppModal>

      <AppModal
        open={openAction === "request-clarification" || openAction === "add-note"}
        onClose={close}
        title={openAction === "request-clarification" ? t("workspace:actions.requestClarification") : t("workspace:actions.addNote")}
        size="lg"
      >
        <AppModalBody>
          {/* The label used to be `sr-only`. A visible label is the governed
              pattern for a critical control, and the accessible name is
              unchanged, so nothing that queried it by name is affected. */}
          <TextareaField
            id="note-text"
            label={openAction === "request-clarification" ? t("workspace:actionBar.notes.clarificationRequested") : t("workspace:actionBar.notes.professionalNote")}
            rows={5}
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder={openAction === "request-clarification" ? t("workspace:actionBar.placeholders.requestClarification") : t("workspace:actionBar.placeholders.addNote")}
          />
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton
            className="primary-action w-full sm:w-auto"
            iconLeft="check"
            onClick={openAction === "request-clarification" ? submitRequestClarification : submitAddNote}
            disabled={!noteText.trim()}
          >
            {t("common:actions.save")}
          </AppButton>
        </AppModalFooter>
      </AppModal>

      <AppModal
        open={openAction === "schedule-consultation"}
        onClose={close}
        title={t("workspace:actions.scheduleConsultation")}
        size="lg"
      >
        <AppModalBody>
          <TextField
            id="consultation-date"
            label={t("workspace:actionBar.fields.proposedDate")}
            type="date"
            value={consultationDate}
            onChange={(event) => setConsultationDate(event.target.value)}
          />
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton className="primary-action w-full sm:w-auto" iconLeft="check" onClick={submitScheduleConsultation}>
            {t("workspace:actions.scheduleConsultation")}
          </AppButton>
        </AppModalFooter>
      </AppModal>

      <AppModal
        open={openAction === "assign-attorney"}
        onClose={close}
        title={t("workspace:actions.assignAttorney")}
        size="lg"
      >
        <AppModalBody>
          <TextField
            id="assign-attorney-name"
            label={t("workspace:actionBar.fields.attorneyName")}
            value={attorneyName}
            onChange={(event) => setAttorneyName(event.target.value)}
            placeholder={t("workspace:actionBar.placeholders.attorneyName")}
          />
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton className="primary-action w-full sm:w-auto" iconLeft="check" onClick={submitAssignAttorney}>
            {t("workspace:actions.assignAttorney")}
          </AppButton>
        </AppModalFooter>
      </AppModal>

      <AppModal
        open={openAction === "generate-summary"}
        onClose={close}
        title={t("workspace:actionBar.summary.title")}
        size="2xl"
      >
        <AppModalBody>
          <p className="rounded-lg bg-warning-soft p-3 text-xs font-medium text-fg-warning">
            {t("workspace:actionBar.summary.disclaimer")}
          </p>
          <TextareaField
            id="summary-draft"
            label={t("workspace:actionBar.summary.title")}
            rows={14}
            value={summaryDraft}
            onChange={(event) => setSummaryDraft(event.target.value)}
            controlClassName="font-mono text-xs"
          />
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.close")}
          </AppButton>
          <AppButton
            className="primary-action w-full sm:w-auto"
            iconLeft="check"
            onClick={() => {
              appendNote(timestampNote(t("workspace:actionBar.notes.summaryGenerated"), summaryDraft));
              close();
            }}
          >
            {t("workspace:actionBar.summary.saveInNotes")}
          </AppButton>
        </AppModalFooter>
      </AppModal>

      <AppModal
        open={openAction === "message-client"}
        onClose={close}
        title={t("workspace:actions.messageClient")}
        description={t("workspace:actionBar.messageClient.description")}
        size="lg"
      >
        <AppModalBody>
          <TextareaField
            id="client-message"
            label={t("workspace:actionBar.messageClient.label")}
            rows={4}
            value={clientMessage}
            onChange={(event) => setClientMessage(event.target.value)}
          />
        </AppModalBody>
        <AppModalFooter>
          <AppButton color="light" className="w-full sm:w-auto" onClick={close}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton
            className="primary-action w-full sm:w-auto"
            iconLeft="chat"
            disabled={busy || !clientMessage.trim()}
            onClick={() => {
              setBusy(true);
              submitMessageClient();
              setBusy(false);
            }}
          >
            {t("common:actions.send")}
          </AppButton>
        </AppModalFooter>
      </AppModal>
    </>
  );
}
