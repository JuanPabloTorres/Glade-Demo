import { Alert, Badge, Button, Card, Progress } from "flowbite-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { bankruptcyApi } from "../api/bankruptcyApi";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { CaseTimeline } from "../components/organisms/CaseTimeline";
import { STATUS_LABELS } from "../config/bankruptcyOptions";
import type { CaseAnalysis } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { currency, localCompletion } from "../workspace/caseMetrics";

/**
 * Client dashboard rebuilt per master instruction §14.1: greeting → status →
 * global progress → next action → chat entry point → pending tasks →
 * requested documents → financial summary → timeline → attorney contact.
 * Financial figures come from the same /bankruptcy/analyze call the case
 * workspace uses, so numbers never drift between the two screens.
 */
export function ClientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspace = useBankruptcyWorkspace();
  const cases = workspace.cases.filter((item) => item.ownerUserId === user?.id);
  const activeCase = cases[0];
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCase) return;
    let active = true;
    setAnalysisError(null);
    bankruptcyApi
      .analyze(activeCase)
      .then((result) => active && setAnalysis(result))
      .catch(() => active && setAnalysisError("No fue posible actualizar el resumen financiero."));
    return () => {
      active = false;
    };
  }, [activeCase]);

  const start = () => {
    if (!user) return;
    navigate(`/case/${workspace.createCase(user)}`);
  };

  const firstName = user?.name.split(" ")[0] ?? "";
  const completion = activeCase ? localCompletion(activeCase) : 0;
  const requestedDocuments = activeCase?.evidence.filter((item) => item.status === "requested") ?? [];
  const nextStep = analysis?.next_steps?.[0];
  const recentEvents = activeCase?.timeline.slice(-3) ?? [];

  if (!activeCase) {
    return (
      <div className="space-y-8">
        <Card className="app-card relative overflow-hidden">
          <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
          <div className="pt-3">
            <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">Portal del cliente</Badge>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl">
              Hola{firstName ? `, ${firstName}` : ""}. Prepara tu historia financiera paso a paso.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
              No necesitas conocer formularios de quiebra. El sistema organiza la información, identifica
              faltantes y prepara el expediente para una conversación más productiva con el abogado.
            </p>
            <Button size="lg" className="primary-action mt-6" onClick={start}>
              <AppIcon name="arrow-right" className="mr-2" />
              Iniciar mi solicitud
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting + status + global progress */}
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="grid gap-6 pt-3 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="indigo" className="w-fit px-3 py-1.5">Portal del cliente</Badge>
              <Badge color={activeCase.status === "submitted" ? "success" : "warning"}>{STATUS_LABELS[activeCase.status]}</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl">
              Hola{firstName ? `, ${firstName}` : ""}. Así va tu expediente.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{activeCase.clientGoal || "Define tu meta principal en la sección Hogar y perfil."}</p>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm"><span className="text-[var(--color-text-muted)]">Información completada</span><span className="font-semibold text-[var(--color-text)]">{completion}%</span></div>
            <Progress progress={completion} color="indigo" size="lg" />
          </div>
        </div>
      </Card>

      {/* Next action */}
      <Card className="app-card border-l-4 border-l-indigo-600">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><AppIcon name="arrow-right" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Próxima acción</p>
              <p className="mt-1 font-semibold text-[var(--color-text)]">
                {nextStep ?? "Continúa completando tu expediente para recibir orientación."}
              </p>
            </div>
          </div>
          <Button className="primary-action shrink-0" onClick={() => navigate(`/case/${activeCase.id}`)}>
            Continuar expediente <AppIcon name="arrow-right" className="ml-2" />
          </Button>
        </div>
      </Card>

      {analysisError ? <Alert color="failure">{analysisError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chat entry point */}
        <Card className="app-card interactive-card cursor-pointer" onClick={() => navigate(`/case/${activeCase.id}`)}>
          <div className="flex items-start gap-3">
            <span className="glade-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"><AppIcon name="chat" /></span>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-text)]">Asistente de preparación</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                Pregunta qué falta, qué documento respalda una cifra, o cuánto te sobra al mes.
              </p>
              <Button size="xs" color="light" className="mt-3">Abrir chat</Button>
            </div>
          </div>
        </Card>

        {/* Attorney contact / review state */}
        <Card className="app-card">
          <div className="flex items-start gap-3">
            <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><AppIcon name="attorney" /></span>
            <div className="flex-1">
              <p className="font-semibold text-[var(--color-text)]">Estado con el abogado</p>
              {activeCase.attorneyNotes?.trim() ? (
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{activeCase.attorneyNotes}</p>
              ) : activeCase.status === "draft" || activeCase.status === "collecting_information" ? (
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">Aún no has enviado tu solicitud al abogado.</p>
              ) : (
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">Tu solicitud fue enviada. El abogado la revisará y dejará notas aquí.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending tasks */}
        <Card className="app-card">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Tareas pendientes</h2>
          <div className="mt-3 space-y-2">
            {(analysis?.missing_items ?? []).length ? (
              analysis!.missing_items.map((item) => (
                <div key={item} className="flex gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                  <AppIcon name="alert" size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No hay tareas pendientes por ahora.</p>
            )}
          </div>
        </Card>

        {/* Requested documents */}
        <Card className="app-card">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Documentos solicitados</h2>
          <div className="mt-3 space-y-2">
            {requestedDocuments.length ? (
              requestedDocuments.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                  <AppIcon name="document" size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                  <span className="flex-1">{item.name}</span>
                  <Badge color="warning">Pendiente</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">El abogado no ha solicitado documentos adicionales.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Financial summary */}
      <Card className="app-card">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Resumen financiero</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Ingreso neto mensual", analysis?.monthly_net_income ?? 0],
            ["Gastos mensuales", analysis?.monthly_expenses ?? 0],
            ["Flujo disponible", analysis?.monthly_cash_flow ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="metric-tile rounded-xl p-4">
              <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">{currency(Number(value))}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="app-card">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Actividad reciente</h2>
        {recentEvents.length ? <CaseTimeline events={recentEvents} /> : <p className="mt-3 text-sm text-[var(--color-text-muted)]">Aún no hay actividad registrada.</p>}
        <Button color="light" size="sm" className="mt-2" onClick={() => navigate(`/case/${activeCase.id}`)}>Ver expediente completo</Button>
      </Card>

      {cases.length > 1 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">Otras solicitudes</h2>
            <Badge color="gray" className="px-3 py-1.5">{cases.length}</Badge>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {cases.slice(1).map((caseData) => (
              <Card key={caseData.id} className="app-card interactive-card">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-lg font-semibold text-[var(--color-text)]">{caseData.clientName}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{caseData.clientGoal || "Define tu meta principal"}</p></div>
                  <Badge color={caseData.status === "submitted" ? "success" : "warning"}>{STATUS_LABELS[caseData.status]}</Badge>
                </div>
                <Button className="primary-action mt-4" onClick={() => navigate(`/case/${caseData.id}`)}>Abrir expediente <AppIcon name="arrow-right" className="ml-2" /></Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <Button color="light" size="sm" onClick={start}><AppIcon name="brand" size={16} className="mr-2" />Iniciar otra solicitud</Button>
      </div>
    </div>
  );
}
