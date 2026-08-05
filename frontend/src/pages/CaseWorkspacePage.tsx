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
  Tabs,
  type TabsRef,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { bankruptcyApi } from "../api/bankruptcyApi";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { BankruptcyEntryModal } from "../components/organisms/BankruptcyEntryModal";
import { CaseTimeline } from "../components/organisms/CaseTimeline";
import { ResponsiveDataView } from "../components/molecules/ResponsiveDataView";
import { StageOrientation } from "../components/molecules/StageOrientation";
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

const GUIDE_TAB_INDEX = 1;

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
  const tabsRef = useRef<TabsRef>(null);

  useEffect(() => {
    if (!caseData) return;
    let active = true;
    setAnalysisError(null);
    bankruptcyApi
      .analyze(caseData)
      .then((result) => active && setAnalysis(result))
      .catch(() => active && setAnalysisError("No fue posible actualizar el análisis financiero."));
    return () => {
      active = false;
    };
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
  const removeEntry = (kind: EntryKind, entryId: string) =>
    update((current) => ({
      ...current,
      incomes: kind === "income" ? current.incomes.filter((item) => item.id !== entryId) : current.incomes,
      expenses: kind === "expense" ? current.expenses.filter((item) => item.id !== entryId) : current.expenses,
      debts: kind === "debt" ? current.debts.filter((item) => item.id !== entryId) : current.debts,
      assets: kind === "asset" ? current.assets.filter((item) => item.id !== entryId) : current.assets,
      evidence: kind === "evidence" ? current.evidence.filter((item) => item.id !== entryId) : current.evidence,
    }));

  const openChat = (prefill?: string) => {
    if (prefill) setMessage(prefill);
    tabsRef.current?.setActiveTab(GUIDE_TAB_INDEX);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    setBusy(true);
    setAnalysisError(null);
    const userMessage = { id: `message-${crypto.randomUUID()}`, role: "user" as const, content: trimmed, createdAt: new Date().toISOString() };
    update((current) => ({ ...current, messages: [...current.messages, userMessage] }));
    try {
      const response = await bankruptcyApi.guide(caseData, trimmed, user.role);
      setGuidance(response);
      update((current) => ({
        ...current,
        messages: [...current.messages, { id: `message-${crypto.randomUUID()}`, role: "assistant", content: response.reply, createdAt: new Date().toISOString() }],
      }));
    } catch {
      setAnalysisError("El asistente no respondió. Intenta de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  };

  const completion = analysis?.completion_score ?? localCompletion(caseData);
  const isAttorney = user.role === "attorney";
  const isSubmitted = caseData.status !== "draft" && caseData.status !== "collecting_information";

  const householdComplete = Boolean(caseData.household.maritalStatus && caseData.household.housingStatus);
  const requiredEvidencePresent = (requirement: string) =>
    caseData.evidence.some((item) => requirement.toLowerCase().split(" ").some((word) => word.length > 5 && item.evidenceType.toLowerCase().includes(word)));
  const requiredEvidence = analysis?.required_evidence ?? [];
  const missingEvidenceCount = requiredEvidence.filter((item) => !requiredEvidencePresent(item)).length;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-[var(--color-border)] bg-white shadow-sm">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button color="light" size="xs" onClick={() => navigate("/")}>← Volver</Button>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge color={statusColor(caseData.status)}>{STATUS_LABELS[caseData.status]}</Badge>
              {caseData.household.urgentCollectionAction ? <Badge color="failure">Atención urgente</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">{caseData.clientName}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">
              {caseData.clientGoal || "Define el objetivo de la consulta y completa la plantilla financiera."}
            </p>
          </div>
          <div className="min-w-[260px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Preparación del expediente</span>
              <span data-testid="completion-score" className="text-2xl font-semibold text-[var(--color-text)]">{completion}%</span>
            </div>
            <Progress progress={completion} color="purple" className="mt-3" />
            {!isAttorney && caseData.status !== "submitted" ? (
              <Button className="glade-button mt-4 w-full" onClick={() => workspace.submitCase(caseData.id)}>Enviar al abogado</Button>
            ) : null}
          </div>
        </div>
      </Card>

      {analysisError ? <Alert color="failure">{analysisError}</Alert> : null}

      <Tabs ref={tabsRef} variant="underline" className="workspace-tabs">
        <TabItem title="Comenzar" active>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Ingreso neto mensual", analysis?.monthly_net_income ?? 0],
                  ["Gastos mensuales", analysis?.monthly_expenses ?? 0],
                  ["Flujo disponible", analysis?.monthly_cash_flow ?? 0],
                  ["Deuda total", analysis?.total_debt ?? 0],
                ].map(([label, value]) => (
                  <Card key={String(label)} className="border border-[var(--color-border)] bg-white shadow-none">
                    <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{currency(Number(value))}</p>
                  </Card>
                ))}
              </div>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Próximos pasos</h2>
                <div className="mt-4 space-y-3">
                  {(analysis?.next_steps ?? ["Completa la plantilla para recibir orientación."]).map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <span className="glade-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{index + 1}</span>
                      <p className="text-sm leading-6 text-[var(--color-text-muted)]">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
              {analysis?.warnings.length ? (
                <Card className="border border-[#f8d3d1] bg-[#fff7f6] shadow-none">
                  <div className="flex items-center gap-2"><AppIcon name="alert" className="text-[#f85e59]" /><h2 className="font-semibold text-[var(--color-text)]">Alertas para revisar</h2></div>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">{analysis.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
                </Card>
              ) : null}
            </div>
            <div className="space-y-5">
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Puntos para discutir con el abogado</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">{analysis?.discussion_points.map((point) => <li key={point}>• {point}</li>)}</ul>
              </Card>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Chapter 7 y Chapter 13</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Estas son preguntas de preparación, no una recomendación automática.</p>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><p className="font-semibold">Chapter 7</p><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">{analysis?.chapter_7_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><p className="font-semibold">Chapter 13</p><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">{analysis?.chapter_13_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div>
                </div>
              </Card>
            </div>
          </div>
        </TabItem>

        <TabItem title="Guía inteligente">
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
              <span className="glade-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><AppIcon name="chat" /></span>
              <div><h2 className="text-xl font-semibold">Asistente de preparación</h2><p className="text-sm text-[var(--color-text-muted)]">Pregunta qué falta o qué debes discutir con el abogado.</p></div>
            </div>
            <div className="my-5 flex min-h-[320px] flex-col gap-3 overflow-y-auto">
              {caseData.messages.map((item) => (
                <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[72%] ${item.role === "user" ? "bg-[#111111] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)]"}`}>{item.content}</div>
                </div>
              ))}
            </div>
            {guidance?.suggested_actions.length ? <div className="mb-4 flex flex-wrap gap-2">{guidance.suggested_actions.map((action) => <Button key={action} size="xs" color="light" onClick={() => setMessage(action)}>{action}</Button>)}</div> : null}
            <form onSubmit={sendMessage} className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row">
              <Label htmlFor="guidance-message" className="sr-only">Mensaje</Label>
              <Textarea id="guidance-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ej. ¿Qué documentos me faltan?" className="flex-1" />
              <Button type="submit" className="glade-button" disabled={busy || !message.trim()}>{busy ? "Analizando..." : "Enviar"}</Button>
            </form>
            {guidance ? <p className="mt-3 text-xs text-[#777]">{guidance.disclaimer}</p> : null}
          </Card>
        </TabItem>

        <TabItem title="Hogar">
          <StageOrientation
            title="Hogar y perfil"
            description="Cuéntanos quién vive en el hogar y tu situación de vivienda. Esto ayuda a calcular gastos permitidos."
            estimatedMinutes={3}
            percentComplete={householdComplete ? 100 : 0}
            missingItems={householdComplete ? [] : ["Estado civil", "Situación de vivienda"]}
            example="Ej. Casado/a, 3 personas en el hogar, vivienda alquilada."
            onOpenChat={() => openChat("No sé qué poner en la sección de hogar")}
          />
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <div className="grid gap-5 lg:grid-cols-2">
              <div><Label htmlFor="client-name">Nombre</Label><TextInput id="client-name" value={caseData.clientName} onChange={(event) => update((current) => ({ ...current, clientName: event.target.value }))} /></div>
              <div><Label htmlFor="client-email">Correo</Label><TextInput id="client-email" type="email" value={caseData.clientEmail} onChange={(event) => update((current) => ({ ...current, clientEmail: event.target.value }))} /></div>
              <div><Label htmlFor="client-phone">Teléfono</Label><TextInput id="client-phone" value={caseData.clientPhone ?? ""} onChange={(event) => update((current) => ({ ...current, clientPhone: event.target.value }))} /></div>
              <div><Label htmlFor="municipality">Municipio</Label><TextInput id="municipality" value={caseData.household.municipality ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, municipality: event.target.value } }))} /></div>
              <div>
                <Label htmlFor="marital-status">Estado civil</Label>
                <Select id="marital-status" value={caseData.household.maritalStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, maritalStatus: event.target.value } }))}>
                  <option value="">Seleccione</option><option value="single">Soltero/a</option><option value="married">Casado/a</option><option value="separated">Separado/a</option><option value="divorced">Divorciado/a</option><option value="widowed">Viudo/a</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="housing-status">Vivienda</Label>
                <Select id="housing-status" value={caseData.household.housingStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, housingStatus: event.target.value } }))}>
                  <option value="">Seleccione</option><option value="rent">Alquiler</option><option value="own">Propia con hipoteca</option><option value="own-free">Propia sin hipoteca</option><option value="family">Con familiar</option><option value="other">Otra</option>
                </Select>
              </div>
              <div><Label htmlFor="household-size">Personas en el hogar</Label><TextInput id="household-size" type="number" min="1" value={caseData.household.householdSize} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, householdSize: Number(event.target.value) } }))} /></div>
              <div><Label htmlFor="dependents">Dependientes</Label><TextInput id="dependents" type="number" min="0" value={caseData.household.dependents} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, dependents: Number(event.target.value) } }))} /></div>
            </div>
            <div className="mt-5"><Label htmlFor="client-goal">¿Qué quieres resolver o entender?</Label><Textarea id="client-goal" rows={4} value={caseData.clientGoal ?? ""} onChange={(event) => update((current) => ({ ...current, clientGoal: event.target.value }))} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2"><Checkbox id="filing-jointly" checked={caseData.household.filingJointly} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, filingJointly: event.target.checked } }))} /><Label htmlFor="filing-jointly">Considera presentación conjunta</Label></div>
              <div className="flex items-center gap-2"><Checkbox id="urgent-action" checked={caseData.household.urgentCollectionAction} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, urgentCollectionAction: event.target.checked } }))} /><Label htmlFor="urgent-action">Cobro urgente</Label></div>
              <div className="flex items-center gap-2"><Checkbox id="recent-transfer" checked={caseData.household.recentPropertyTransfer} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, recentPropertyTransfer: event.target.checked } }))} /><Label htmlFor="recent-transfer">Transferencia reciente</Label></div>
            </div>
          </Card>
        </TabItem>

        <TabItem title="Ingresos">
          <StageOrientation
            title="Ingresos"
            description="Registra cada fuente de ingreso del hogar. Cada frecuencia se normaliza a un equivalente mensual para comparar con tus gastos."
            estimatedMinutes={4}
            percentComplete={caseData.incomes.length ? 100 : 0}
            missingItems={caseData.incomes.length ? [] : ["Agrega al menos un ingreso"]}
            example="Ej. Salario quincenal de $1,200 brutos."
            primaryActionLabel="Añadir ingreso"
            onPrimaryAction={() => setModalKind("income")}
            onOpenChat={() => openChat("¿Qué cuenta como ingreso?")}
          />
          <ResponsiveDataView
            emptyMessage="Aún no has agregado ingresos."
            rows={caseData.incomes}
            rowKey={(item) => item.id}
            renderActions={(item) => <Button size="xs" color="light" onClick={() => removeEntry("income", item.id)}>Eliminar</Button>}
            columns={[
              { key: "source", header: "Fuente", hideLabelOnCard: true, render: (item) => <div><p className="font-semibold">{item.source}</p><p className="text-xs text-[var(--color-text-muted)]">{item.category}</p></div> },
              { key: "frequency", header: "Frecuencia", render: (item) => item.frequency },
              { key: "gross", header: "Bruto mensual", render: (item) => currency(monthlyAmount(item.grossAmount, item.frequency)) },
              { key: "net", header: "Neto mensual", render: (item) => currency(monthlyAmount(item.netAmount ?? item.grossAmount, item.frequency)) },
            ]}
          />
        </TabItem>

        <TabItem title="Gastos">
          <StageOrientation
            title="Gastos mensuales"
            description="Categorías inspiradas en Schedule J para facilitar la revisión del abogado."
            estimatedMinutes={5}
            percentComplete={caseData.expenses.length ? 100 : 0}
            missingItems={caseData.expenses.length ? [] : ["Agrega al menos un gasto"]}
            example="Ej. Renta $650/mes, marcado como necesario."
            primaryActionLabel="Añadir gasto"
            onPrimaryAction={() => setModalKind("expense")}
            onOpenChat={() => openChat("¿Cuánto me sobra al mes?")}
          />
          <ResponsiveDataView
            emptyMessage="Aún no has agregado gastos."
            rows={caseData.expenses}
            rowKey={(item) => item.id}
            renderActions={(item) => <Button size="xs" color="light" onClick={() => removeEntry("expense", item.id)}>Eliminar</Button>}
            columns={[
              { key: "category", header: "Categoría", hideLabelOnCard: true, render: (item) => <p className="font-semibold">{item.category}</p> },
              { key: "description", header: "Descripción", render: (item) => item.description },
              { key: "amount", header: "Monto", render: (item) => currency(item.monthlyAmount) },
              { key: "essential", header: "Necesario", render: (item) => (item.essential ? "Sí" : "No") },
            ]}
          />
        </TabItem>

        <TabItem title="Deudas">
          <StageOrientation
            title="Deudas"
            description="Incluye todos los acreedores, incluso familiares, cobros y cuentas disputadas."
            estimatedMinutes={5}
            percentComplete={caseData.debts.length ? 100 : 0}
            missingItems={caseData.debts.length ? [] : ["Agrega al menos una deuda, si aplica"]}
            example="Ej. Tarjeta de crédito, balance $3,200, sin demanda."
            primaryActionLabel="Añadir deuda"
            onPrimaryAction={() => setModalKind("debt")}
            onOpenChat={() => openChat("Tengo una demanda de un acreedor")}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {caseData.debts.map((item) => (
              <Card key={item.id} className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-none">
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold">{item.creditor}</p><p className="text-sm text-[var(--color-text-muted)]">{item.description}</p></div>
                  <Badge color={item.collectionLawsuit || item.delinquentAmount > 0 ? "failure" : "gray"}>{item.debtType}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-[var(--color-text-muted)]">Balance</p><p className="font-semibold">{currency(item.balance)}</p></div>
                  <div><p className="text-[var(--color-text-muted)]">Atraso</p><p className="font-semibold">{currency(item.delinquentAmount)}</p></div>
                </div>
                <Button size="xs" color="light" className="mt-4" onClick={() => removeEntry("debt", item.id)}>Eliminar</Button>
              </Card>
            ))}
            {!caseData.debts.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)] lg:col-span-2">No hay deudas registradas todavía.</p> : null}
          </div>
        </TabItem>

        <TabItem title="Bienes">
          <StageOrientation
            title="Bienes y activos"
            description="Registra propiedad, cuentas, vehículos, retiro y otros derechos de valor."
            estimatedMinutes={4}
            percentComplete={caseData.assets.length ? 100 : 0}
            missingItems={caseData.assets.length ? [] : ["Agrega al menos un bien, si aplica"]}
            example="Ej. Vehículo 2018, valor estimado $9,000, gravamen $4,200."
            primaryActionLabel="Añadir bien"
            onPrimaryAction={() => setModalKind("asset")}
            onOpenChat={() => openChat("¿Me van a quitar el carro?")}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {caseData.assets.map((item) => (
              <Card key={item.id} className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-none">
                <p className="font-semibold">{item.description}</p><p className="text-sm text-[var(--color-text-muted)]">{item.category}</p>
                <div className="mt-3 flex justify-between text-sm"><span>Valor {currency(item.estimatedValue)}</span><span>Gravamen {currency(item.loanBalance)}</span></div>
                <Button size="xs" color="light" className="mt-4" onClick={() => removeEntry("asset", item.id)}>Eliminar</Button>
              </Card>
            ))}
            {!caseData.assets.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)] lg:col-span-2">No hay bienes registrados todavía.</p> : null}
          </div>
        </TabItem>

        <TabItem title="Documentos">
          <StageOrientation
            title="Documentos del expediente"
            description="El demo guarda metadatos locales, no archivos reales. Cada documento respalda una cifra que ya declaraste."
            estimatedMinutes={6}
            percentComplete={analysis?.evidence_score ?? 0}
            missingItems={missingEvidenceCount ? [`${missingEvidenceCount} documento(s) sugerido(s) sin respaldo`] : []}
            example="Ej. Talón de pago más reciente respalda tu ingreso declarado."
            primaryActionLabel="Añadir evidencia"
            onPrimaryAction={() => setModalKind("evidence")}
            onOpenChat={() => openChat("¿Qué documento necesito?")}
          />
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <Card className="border border-[var(--color-border)] bg-white shadow-sm">
              <div className="space-y-3">
                {caseData.evidence.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]"><AppIcon name="evidence" /></span>
                      <div><p className="font-semibold">{item.name}</p><p className="text-sm text-[var(--color-text-muted)]">{item.evidenceType}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={item.status === "reviewed" ? "success" : item.status === "received" ? "info" : item.status === "requested" ? "warning" : "gray"}>{item.status}</Badge>
                      <Button size="xs" color="light" onClick={() => removeEntry("evidence", item.id)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
                {!caseData.evidence.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">No hay documentos registrados todavía.</p> : null}
              </div>
            </Card>
            <Card className="border border-[var(--color-border)] bg-white shadow-sm">
              <h2 className="text-lg font-semibold">Lista inteligente de evidencia</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">La lista se adapta a deudas garantizadas, cobros, empleo propio y transferencias.</p>
              <div className="mt-4 space-y-2">
                {requiredEvidence.map((requirement) => {
                  const present = requiredEvidencePresent(requirement);
                  return (
                    <div key={requirement} className="flex gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                      <AppIcon name={present ? "check" : "document"} className={present ? "text-emerald-700" : "text-[var(--color-text-muted)]"} />
                      <span>{requirement}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabItem>

        <TabItem title="Revisión">
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">Revisa antes de enviar</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Confirma que cada sección esté completa. Puedes regresar a cualquier sección sin perder lo que ya escribiste.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["Hogar y perfil", householdComplete],
                ["Ingresos", caseData.incomes.length > 0],
                ["Gastos", caseData.expenses.length > 0],
                ["Deudas", caseData.debts.length > 0],
                ["Bienes", caseData.assets.length > 0],
                ["Documentos", caseData.evidence.length > 0],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                  <AppIcon name={done ? "check" : "alert"} size={16} className={done ? "text-emerald-700" : "text-[var(--color-warning)]"} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">Qué verá el abogado</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                El resumen financiero, tu meta declarada, alertas detectadas y los documentos que hayas registrado. El abogado no verá el contenido de este chat como conversación privada tuya — solo el expediente estructurado.
              </p>
            </div>
            {!isAttorney && caseData.status === "draft" ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">Cuando estés listo, usa el botón "Enviar al abogado" en la parte superior de esta página.</p> : null}
          </Card>
        </TabItem>

        <TabItem title="Enviado">
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            {isSubmitted ? (
              <>
                <div className="flex items-center gap-3"><AppIcon name="check" className="text-emerald-700" /><h2 className="text-xl font-semibold text-[var(--color-text)]">Tu solicitud fue enviada</h2></div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {caseData.submittedAt ? `Enviada el ${new Date(caseData.submittedAt).toLocaleDateString("es-PR")}.` : "El abogado ya tiene acceso a tu expediente."}
                  {" "}El abogado revisará la información y podría solicitar aclaraciones o documentos adicionales.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[var(--color-text)]">Aún no has enviado tu solicitud</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Completa la revisión y usa el botón "Enviar al abogado" en la parte superior de esta página cuando estés listo.</p>
              </>
            )}
          </Card>
        </TabItem>

        <TabItem title="Seguimiento">
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">Proceso del caso</h2>
            <CaseTimeline events={caseData.timeline} />
          </Card>
        </TabItem>

        {isAttorney ? (
          <TabItem title="Revisión del abogado">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <Label htmlFor="attorney-status">Estado del caso</Label>
                <Select id="attorney-status" value={caseData.status} onChange={(event) => workspace.updateStatus(caseData.id, event.target.value as CaseStatus)}>
                  <option value="submitted">Solicitud enviada</option><option value="attorney_review">Revisión del abogado</option><option value="consultation_scheduled">Consulta programada</option><option value="decision_pending">Decisión pendiente</option><option value="filing_preparation">Preparación para presentación</option><option value="closed">Cerrado</option>
                </Select>
                <div className="mt-5">
                  <Label htmlFor="attorney-notes">Notas profesionales</Label>
                  <Textarea id="attorney-notes" rows={10} value={caseData.attorneyNotes ?? ""} onChange={(event) => update((current) => ({ ...current, attorneyNotes: event.target.value }))} placeholder="Preguntas, documentos faltantes y asuntos jurídicos que requieren discusión." />
                </div>
              </Card>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold">Checklist profesional</h2>
                <div className="mt-4 space-y-3">{analysis?.discussion_points.map((item) => <div key={item} className="flex gap-3 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm"><AppIcon name="check" className="shrink-0" /><span>{item}</span></div>)}</div>
              </Card>
            </div>
          </TabItem>
        ) : null}
      </Tabs>

      <BankruptcyEntryModal open={Boolean(modalKind)} kind={modalKind} onClose={() => setModalKind(null)} onSave={addEntry} />
    </div>
  );
}
