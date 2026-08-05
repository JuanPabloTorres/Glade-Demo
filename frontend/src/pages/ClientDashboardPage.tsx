import { Badge, Button, Card, Progress } from "flowbite-react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { STATUS_LABELS } from "../config/bankruptcyOptions";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../workspace/caseMetrics";

export function ClientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspace = useBankruptcyWorkspace();
  const cases = workspace.cases.filter((item) => item.ownerUserId === user?.id);
  const activeCase = cases[0];

  const start = () => {
    if (!user) return;
    navigate(`/case/${workspace.createCase(user)}`);
  };

  return (
    <div className="space-y-8">
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="grid gap-8 pt-3 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">Portal del cliente</Badge>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--glade-black)] sm:text-4xl lg:text-[2.75rem]">Prepara tu historia financiera paso a paso.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--glade-muted)]">No necesitas conocer formularios de quiebra. El sistema organiza la información, identifica faltantes y prepara el expediente para una conversación más productiva con el abogado.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="primary-action" onClick={start}>Iniciar nueva solicitud</Button>
              {activeCase ? <Button size="lg" color="light" className="secondary-action" onClick={() => navigate(`/case/${activeCase.id}`)}>Continuar solicitud</Button> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["calculator", "Presupuesto mensual", "Convierte ingresos y gastos a una vista comparable."],
              ["debt", "Mapa de deudas", "Separa deudas garantizadas, prioritarias y no garantizadas."],
              ["attorney", "Consulta preparada", "Entrega preguntas, alertas y evidencia al abogado."],
            ].map(([icon, title, detail]) => (
              <Card key={title} className="metric-tile shadow-none">
                <div className="flex gap-3">
                  <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><AppIcon name={icon as "calculator" | "debt" | "attorney"} /></span>
                  <div><p className="font-semibold text-[var(--glade-black)]">{title}</p><p className="mt-1 text-sm leading-5 text-[var(--glade-muted)]">{detail}</p></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-700">Tus expedientes</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--glade-black)]">Solicitudes activas</h2></div>
          <Badge color="gray" className="px-3 py-1.5">{cases.length}</Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {cases.map((caseData) => {
            const completion = localCompletion(caseData);
            return (
              <Card key={caseData.id} className="app-card interactive-card">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-lg font-semibold text-[var(--glade-black)]">{caseData.clientName}</p><p className="mt-1 text-sm text-[var(--glade-muted)]">{caseData.clientGoal || "Define tu meta principal"}</p></div>
                  <Badge color={caseData.status === "submitted" ? "success" : "warning"}>{STATUS_LABELS[caseData.status]}</Badge>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm"><span className="text-[var(--glade-muted)]">Información completada</span><span className="font-semibold text-[var(--glade-black)]">{completion}%</span></div>
                  <Progress progress={completion} color="indigo" size="lg" />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button className="primary-action" onClick={() => navigate(`/case/${caseData.id}`)}>Abrir expediente <AppIcon name="arrow-right" className="ml-2" /></Button>
                </div>
              </Card>
            );
          })}
          {!cases.length ? (
            <Card className="app-card border-dashed text-center shadow-none">
              <span className="icon-tile mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"><AppIcon name="document" size={28} /></span>
              <p className="mt-4 font-semibold text-[var(--glade-black)]">Aún no hay solicitudes.</p>
              <p className="mt-1 text-sm text-[var(--glade-muted)]">Inicia una para comenzar la plantilla guiada.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
