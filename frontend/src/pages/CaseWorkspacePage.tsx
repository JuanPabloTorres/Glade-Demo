import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Progress,
  Select,
  TabItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tabs,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { bankruptcyApi } from "../api/bankruptcyApi";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { BankruptcyEntryModal } from "../components/organisms/BankruptcyEntryModal";
import { CaseTimeline } from "../components/organisms/CaseTimeline";
import { STATUS_LABELS } from "../config/bankruptcyOptions";
import type {
  BankruptcyCase,
  CaseAnalysis,
  CaseStatus,
  EntryKind,
  EntrySubmission,
  GuidanceResponse,
} from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { currency, localCompletion, monthlyAmount } from "../workspace/caseMetrics";

function statusColor(status: CaseStatus): "gray" | "warning" | "success" | "info" {
  if (status === "submitted" || status === "attorney_review") return "warning";
  if (status === "consultation_scheduled" || status === "filing_preparation") return "info";
  if (status === "closed") return "success";
  return "gray";
}

export function CaseWorkspacePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const caseData = workspace.cases.find((item) => item.id === caseId);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<EntryKind | null>(null);
  const [message, setMessage] = useState("");
  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!caseData) return;
    let active = true;
    setAnalysisError(null);
    bankruptcyApi.analyze(caseData).then((result) => active && setAnalysis(result)).catch(() => active && setAnalysisError("No fue posible actualizar el análisis financiero."));
    return () => { active = false; };
  }, [caseData]);

  if (!caseData || !user) return <Navigate to="/" replace />;
  if (user.role === "client" && caseData.ownerUserId !== user.id) return <Navigate to="/" replace />;

  const update = (updater: (value: BankruptcyCase) => BankruptcyCase) => workspace.updateCase(caseData.id, updater);
  const addEntry = (submission: EntrySubmission) => {
    update((current) => {
      if (submission.kind === "income") return { ...current, incomes: [...current.incomes, submission.value] };
      if (submission.kind === "expense") return { ...current, expenses: [...current.expenses, submission.value] };
      if (submission.kind === "debt") return { ...current, debts: [...current.debts, submission.value] };
      if (submission.kind === "asset") return { ...current, assets: [...current.assets, submission.value] };
      return { ...current, evidence: [...current.evidence, submission.value] };
    });
  };
  const removeEntry = (kind: EntryKind, entryId: string) => update((current) => ({
    ...current,
    incomes: kind === "income" ? current.incomes.filter((item) => item.id !== entryId) : current.incomes,
    expenses: kind === "expense" ? current.expenses.filter((item) => item.id !== entryId) : current.expenses,
    debts: kind === "debt" ? current.debts.filter((item) => item.id !== entryId) : current.debts,
    assets: kind === "asset" ? current.assets.filter((item) => item.id !== entryId) : current.assets,
    evidence: kind === "evidence" ? current.evidence.filter((item) => item.id !== entryId) : current.evidence,
  }));

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    setBusy(true);
    const userMessage = { id: `message-${crypto.randomUUID()}`, role: "user" as const, content: trimmed, createdAt: new Date().toISOString() };
    update((current) => ({ ...current, messages: [...current.messages, userMessage] }));
    try {
      const response = await bankruptcyApi.guide(caseData, trimmed, user.role);
      setGuidance(response);
      update((current) => ({ ...current, messages: [...current.messages, { id: `message-${crypto.randomUUID()}`, role: "assistant", content: response.reply, createdAt: new Date().toISOString() }] }));
    } finally {
      setBusy(false);
    }
  };

  const completion = analysis?.completion_score ?? localCompletion(caseData);
  const isAttorney = user.role === "attorney";

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-[var(--glade-border)] bg-white shadow-sm"><div className="glade-gradient absolute inset-x-0 top-0 h-1.5" /><div className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between"><div><Button color="light" size="xs" onClick={() => navigate("/")}>← Volver</Button><div className="mt-4 flex flex-wrap items-center gap-3"><Badge color={statusColor(caseData.status)}>{STATUS_LABELS[caseData.status]}</Badge>{caseData.household.urgentCollectionAction ? <Badge color="failure">Atención urgente</Badge> : null}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111111]">{caseData.clientName}</h1><p className="mt-2 max-w-3xl text-base leading-7 text-[#5f5f5f]">{caseData.clientGoal || "Define el objetivo de la consulta y completa la plantilla financiera."}</p></div><div className="min-w-[260px] rounded-2xl border border-[var(--glade-border)] bg-[var(--glade-surface)] p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#5f5f5f]">Preparación del expediente</span><span data-testid="completion-score" className="text-2xl font-semibold text-[#111111]">{completion}%</span></div><Progress progress={completion} color="purple" className="mt-3" />{!isAttorney && caseData.status !== "submitted" ? <Button className="glade-button mt-4 w-full" onClick={() => workspace.submitCase(caseData.id)}>Enviar al abogado</Button> : null}</div></div></Card>

      {analysisError ? <Alert color="failure">{analysisError}</Alert> : null}

      <Tabs variant="underline" className="workspace-tabs">
        <TabItem title="Resumen" active>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
              ["Ingreso neto mensual", analysis?.monthly_net_income ?? 0],
              ["Gastos mensuales", analysis?.monthly_expenses ?? 0],
              ["Flujo disponible", analysis?.monthly_cash_flow ?? 0],
              ["Deuda total", analysis?.total_debt ?? 0],
            ].map(([label, value]) => <Card key={String(label)} className="border border-[var(--glade-border)] bg-white shadow-none"><p className="text-sm text-[#5f5f5f]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#111111]">{currency(Number(value))}</p></Card>)}</div>
              <Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="text-xl font-semibold text-[#111111]">Próximos pasos</h2><div className="mt-4 space-y-3">{(analysis?.next_steps ?? ["Completa la plantilla para recibir orientación."]).map((step, index) => <div key={step} className="flex gap-3"><span className="glade-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{index + 1}</span><p className="text-sm leading-6 text-[#5f5f5f]">{step}</p></div>)}</div></Card>
              {analysis?.warnings.length ? <Card className="border border-[#f8d3d1] bg-[#fff7f6] shadow-none"><div className="flex items-center gap-2"><AppIcon name="alert" className="text-[#f85e59]" /><h2 className="font-semibold text-[#111111]">Alertas para revisar</h2></div><ul className="mt-3 space-y-2 text-sm text-[#5f5f5f]">{analysis.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></Card> : null}
            </div>
            <div className="space-y-5"><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="text-lg font-semibold text-[#111111]">Puntos para discutir con el abogado</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f5f5f]">{analysis?.discussion_points.map((point) => <li key={point}>• {point}</li>)}</ul></Card><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="text-lg font-semibold text-[#111111]">Chapter 7 y Chapter 13</h2><p className="mt-2 text-sm leading-6 text-[#5f5f5f]">Estas son preguntas de preparación, no una recomendación automática.</p><div className="mt-4 grid gap-4"><div className="rounded-xl bg-[var(--glade-surface)] p-4"><p className="font-semibold">Chapter 7</p><ul className="mt-2 space-y-1 text-sm text-[#5f5f5f]">{analysis?.chapter_7_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div><div className="rounded-xl bg-[var(--glade-surface)] p-4"><p className="font-semibold">Chapter 13</p><ul className="mt-2 space-y-1 text-sm text-[#5f5f5f]">{analysis?.chapter_13_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div></div></Card></div>
          </div>
        </TabItem>

        <TabItem title="Guía inteligente">
          <Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-[var(--glade-border)] pb-4"><span className="glade-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><AppIcon name="chat" /></span><div><h2 className="text-xl font-semibold">Asistente de preparación</h2><p className="text-sm text-[#5f5f5f]">Pregunta qué falta o qué debes discutir con el abogado.</p></div></div><div className="my-5 flex min-h-[320px] flex-col gap-3 overflow-y-auto">{caseData.messages.map((item) => <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[72%] ${item.role === "user" ? "bg-[#111111] text-white" : "border border-[var(--glade-border)] bg-[var(--glade-surface)] text-[#111111]"}`}>{item.content}</div></div>)}</div>{guidance?.suggested_actions.length ? <div className="mb-4 flex flex-wrap gap-2">{guidance.suggested_actions.map((action) => <Button key={action} size="xs" color="light" onClick={() => setMessage(action)}>{action}</Button>)}</div> : null}<form onSubmit={sendMessage} className="flex flex-col gap-3 border-t border-[var(--glade-border)] pt-4 sm:flex-row"><Label htmlFor="guidance-message" className="sr-only">Mensaje</Label><Textarea id="guidance-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ej. ¿Qué documentos me faltan?" className="flex-1" /><Button type="submit" className="glade-button" disabled={busy || !message.trim()}>{busy ? "Analizando..." : "Enviar"}</Button></form>{guidance ? <p className="mt-3 text-xs text-[#777]">{guidance.disclaimer}</p> : null}</Card>
        </TabItem>

        <TabItem title="Hogar y perfil">
          <Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="grid gap-5 lg:grid-cols-2"><div><Label htmlFor="client-name">Nombre</Label><TextInput id="client-name" value={caseData.clientName} onChange={(event) => update((current) => ({ ...current, clientName: event.target.value }))} /></div><div><Label htmlFor="client-email">Correo</Label><TextInput id="client-email" type="email" value={caseData.clientEmail} onChange={(event) => update((current) => ({ ...current, clientEmail: event.target.value }))} /></div><div><Label htmlFor="client-phone">Teléfono</Label><TextInput id="client-phone" value={caseData.clientPhone ?? ""} onChange={(event) => update((current) => ({ ...current, clientPhone: event.target.value }))} /></div><div><Label htmlFor="municipality">Municipio</Label><TextInput id="municipality" value={caseData.household.municipality ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, municipality: event.target.value } }))} /></div><div><Label htmlFor="marital-status">Estado civil</Label><Select id="marital-status" value={caseData.household.maritalStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, maritalStatus: event.target.value } }))}><option value="">Seleccione</option><option value="single">Soltero/a</option><option value="married">Casado/a</option><option value="separated">Separado/a</option><option value="divorced">Divorciado/a</option><option value="widowed">Viudo/a</option></Select></div><div><Label htmlFor="housing-status">Vivienda</Label><Select id="housing-status" value={caseData.household.housingStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, housingStatus: event.target.value } }))}><option value="">Seleccione</option><option value="rent">Alquiler</option><option value="own">Propia con hipoteca</option><option value="own-free">Propia sin hipoteca</option><option value="family">Con familiar</option><option value="other">Otra</option></Select></div><div><Label htmlFor="household-size">Personas en el hogar</Label><TextInput id="household-size" type="number" min="1" value={caseData.household.householdSize} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, householdSize: Number(event.target.value) } }))} /></div><div><Label htmlFor="dependents">Dependientes</Label><TextInput id="dependents" type="number" min="0" value={caseData.household.dependents} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, dependents: Number(event.target.value) } }))} /></div></div><div className="mt-5"><Label htmlFor="client-goal">¿Qué quieres resolver o entender?</Label><Textarea id="client-goal" rows={4} value={caseData.clientGoal ?? ""} onChange={(event) => update((current) => ({ ...current, clientGoal: event.target.value }))} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-2"><Checkbox id="filing-jointly" checked={caseData.household.filingJointly} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, filingJointly: event.target.checked } }))} /><Label htmlFor="filing-jointly">Considera presentación conjunta</Label></div><div className="flex items-center gap-2"><Checkbox id="urgent-action" checked={caseData.household.urgentCollectionAction} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, urgentCollectionAction: event.target.checked } }))} /><Label htmlFor="urgent-action">Cobro urgente</Label></div><div className="flex items-center gap-2"><Checkbox id="recent-transfer" checked={caseData.household.recentPropertyTransfer} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, recentPropertyTransfer: event.target.checked } }))} /><Label htmlFor="recent-transfer">Transferencia reciente</Label></div></div></Card>
        </TabItem>

        <TabItem title="Ingresos y gastos">
          <div className="space-y-5"><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Ingresos</h2><p className="text-sm text-[#5f5f5f]">Cada frecuencia se normaliza a equivalente mensual.</p></div><Button className="glade-button" onClick={() => setModalKind("income")}>Añadir ingreso</Button></div><div className="overflow-x-auto"><Table><TableHead><TableRow><TableHeadCell>Fuente</TableHeadCell><TableHeadCell>Frecuencia</TableHeadCell><TableHeadCell>Bruto mensual</TableHeadCell><TableHeadCell>Neto mensual</TableHeadCell><TableHeadCell /></TableRow></TableHead><TableBody>{caseData.incomes.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold">{item.source}</p><p className="text-xs text-[#777]">{item.category}</p></TableCell><TableCell>{item.frequency}</TableCell><TableCell>{currency(monthlyAmount(item.grossAmount, item.frequency))}</TableCell><TableCell>{currency(monthlyAmount(item.netAmount ?? item.grossAmount, item.frequency))}</TableCell><TableCell><Button size="xs" color="light" onClick={() => removeEntry("income", item.id)}>Eliminar</Button></TableCell></TableRow>)}</TableBody></Table></div></Card><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Gastos mensuales</h2><p className="text-sm text-[#5f5f5f]">Categorías inspiradas en Schedule J para facilitar la revisión.</p></div><Button className="glade-button" onClick={() => setModalKind("expense")}>Añadir gasto</Button></div><div className="overflow-x-auto"><Table><TableHead><TableRow><TableHeadCell>Categoría</TableHeadCell><TableHeadCell>Descripción</TableHeadCell><TableHeadCell>Monto</TableHeadCell><TableHeadCell>Necesario</TableHeadCell><TableHeadCell /></TableRow></TableHead><TableBody>{caseData.expenses.map((item) => <TableRow key={item.id}><TableCell>{item.category}</TableCell><TableCell>{item.description}</TableCell><TableCell>{currency(item.monthlyAmount)}</TableCell><TableCell>{item.essential ? "Sí" : "No"}</TableCell><TableCell><Button size="xs" color="light" onClick={() => removeEntry("expense", item.id)}>Eliminar</Button></TableCell></TableRow>)}</TableBody></Table></div></Card></div>
        </TabItem>

        <TabItem title="Deudas y bienes">
          <div className="space-y-5"><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Deudas</h2><p className="text-sm text-[#5f5f5f]">Incluye todos los acreedores, incluso familiares, cobros y cuentas disputadas.</p></div><Button className="glade-button" onClick={() => setModalKind("debt")}>Añadir deuda</Button></div><div className="grid gap-3 lg:grid-cols-2">{caseData.debts.map((item) => <Card key={item.id} className="border border-[var(--glade-border)] bg-[var(--glade-surface)] shadow-none"><div className="flex items-start justify-between"><div><p className="font-semibold">{item.creditor}</p><p className="text-sm text-[#5f5f5f]">{item.description}</p></div><Badge color={item.collectionLawsuit || item.delinquentAmount > 0 ? "failure" : "gray"}>{item.debtType}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-[#777]">Balance</p><p className="font-semibold">{currency(item.balance)}</p></div><div><p className="text-[#777]">Atraso</p><p className="font-semibold">{currency(item.delinquentAmount)}</p></div></div><Button size="xs" color="light" className="mt-4" onClick={() => removeEntry("debt", item.id)}>Eliminar</Button></Card>)}</div></Card><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Bienes y activos</h2><p className="text-sm text-[#5f5f5f]">Registra propiedad, cuentas, vehículos, retiro y otros derechos de valor.</p></div><Button className="glade-button" onClick={() => setModalKind("asset")}>Añadir bien</Button></div><div className="grid gap-3 lg:grid-cols-2">{caseData.assets.map((item) => <Card key={item.id} className="border border-[var(--glade-border)] bg-[var(--glade-surface)] shadow-none"><p className="font-semibold">{item.description}</p><p className="text-sm text-[#5f5f5f]">{item.category}</p><div className="mt-3 flex justify-between text-sm"><span>Valor {currency(item.estimatedValue)}</span><span>Gravamen {currency(item.loanBalance)}</span></div><Button size="xs" color="light" className="mt-4" onClick={() => removeEntry("asset", item.id)}>Eliminar</Button></Card>)}</div></Card></div>
        </TabItem>

        <TabItem title="Evidencia">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]"><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Documentos del expediente</h2><p className="text-sm text-[#5f5f5f]">El demo guarda metadatos locales, no archivos reales.</p></div><Button className="glade-button" onClick={() => setModalKind("evidence")}>Añadir evidencia</Button></div><div className="space-y-3">{caseData.evidence.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--glade-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--glade-surface)]"><AppIcon name="evidence" /></span><div><p className="font-semibold">{item.name}</p><p className="text-sm text-[#5f5f5f]">{item.evidenceType}</p></div></div><div className="flex items-center gap-2"><Badge color={item.status === "reviewed" ? "success" : item.status === "received" ? "info" : "warning"}>{item.status}</Badge><Button size="xs" color="light" onClick={() => removeEntry("evidence", item.id)}>Eliminar</Button></div></div>)}</div></Card><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="text-lg font-semibold">Lista inteligente de evidencia</h2><p className="mt-2 text-sm leading-6 text-[#5f5f5f]">La lista se adapta a deudas garantizadas, cobros, empleo propio y transferencias.</p><div className="mt-4 space-y-2">{analysis?.required_evidence.map((requirement) => { const present = caseData.evidence.some((item) => requirement.toLowerCase().split(" ").some((word) => word.length > 5 && item.evidenceType.toLowerCase().includes(word))); return <div key={requirement} className="flex gap-2 rounded-lg bg-[var(--glade-surface)] p-3 text-sm"><AppIcon name={present ? "check" : "document"} className={present ? "text-emerald-700" : "text-[#777]"} /><span>{requirement}</span></div>; })}</div></Card></div>
        </TabItem>

        <TabItem title="Timeline">
          <Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="mb-5 text-xl font-semibold">Proceso del caso</h2><CaseTimeline events={caseData.timeline} /></Card>
        </TabItem>

        {isAttorney ? <TabItem title="Revisión del abogado"><div className="grid gap-5 lg:grid-cols-2"><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><Label htmlFor="attorney-status">Estado del caso</Label><Select id="attorney-status" value={caseData.status} onChange={(event) => workspace.updateStatus(caseData.id, event.target.value as CaseStatus)}><option value="submitted">Solicitud enviada</option><option value="attorney_review">Revisión del abogado</option><option value="consultation_scheduled">Consulta programada</option><option value="decision_pending">Decisión pendiente</option><option value="filing_preparation">Preparación para presentación</option><option value="closed">Cerrado</option></Select><div className="mt-5"><Label htmlFor="attorney-notes">Notas profesionales</Label><Textarea id="attorney-notes" rows={10} value={caseData.attorneyNotes ?? ""} onChange={(event) => update((current) => ({ ...current, attorneyNotes: event.target.value }))} placeholder="Preguntas, documentos faltantes y asuntos jurídicos que requieren discusión." /></div></Card><Card className="border border-[var(--glade-border)] bg-white shadow-sm"><h2 className="text-lg font-semibold">Checklist profesional</h2><div className="mt-4 space-y-3">{analysis?.discussion_points.map((item) => <div key={item} className="flex gap-3 rounded-xl bg-[var(--glade-surface)] p-3 text-sm"><AppIcon name="check" className="shrink-0" /><span>{item}</span></div>)}</div></Card></div></TabItem> : null}
      </Tabs>

      <BankruptcyEntryModal open={Boolean(modalKind)} kind={modalKind} onClose={() => setModalKind(null)} onSave={addEntry} />
    </div>
  );
}
