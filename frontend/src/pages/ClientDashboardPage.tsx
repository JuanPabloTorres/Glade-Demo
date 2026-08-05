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

  const start = () => {
    if (!user) return;
    navigate(`/case/${workspace.createCase(user)}`);
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-[var(--glade-border)] bg-white shadow-sm">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="grid gap-6 pt-3 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div><Badge color="gray" className="mb-4 w-fit">Portal del cliente</Badge><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#111111] sm:text-4xl">Prepara tu historia financiera paso a paso.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#5f5f5f]">No necesitas conocer formularios de quiebra. El sistema organiza la información y te indica qué falta antes de hablar con un abogado.</p><div className="mt-5 flex flex-wrap gap-3"><Button className="glade-button" onClick={start}>Iniciar nueva solicitud</Button>{cases[0] ? <Button color="alternative" onClick={() => navigate(`/case/${cases[0].id}`)}>Continuar solicitud</Button> : null}</div></div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{[
            ["calculator", "Presupuesto mensual", "Convierte ingresos y gastos a una vista comparable"],
            ["debt", "Mapa de deudas", "Separa deudas garantizadas, prioritarias y no garantizadas"],
            ["attorney", "Consulta preparada", "Entrega preguntas, alertas y evidencia al abogado"],
          ].map(([icon, title, detail]) => <Card key={title} className="border border-[var(--glade-border)] bg-[var(--glade-surface)] shadow-none"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white"><AppIcon name={icon as "calculator" | "debt" | "attorney"} /></span><div><p className="font-semibold text-[#111111]">{title}</p><p className="mt-1 text-sm text-[#5f5f5f]">{detail}</p></div></div></Card>)}</div>
        </div>
      </Card>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#777]">Tus expedientes</p><h2 className="mt-1 text-2xl font-semibold text-[#111111]">Solicitudes activas</h2></div><Badge color="gray">{cases.length}</Badge></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {cases.map((caseData) => {
            const completion = localCompletion(caseData);
            return <Card key={caseData.id} className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold text-[#111111]">{caseData.clientName}</p><p className="mt-1 text-sm text-[#5f5f5f]">{caseData.clientGoal || "Define tu meta principal"}</p></div><Badge color={caseData.status === "submitted" ? "success" : "warning"}>{STATUS_LABELS[caseData.status]}</Badge></div><div className="mt-4"><div className="mb-2 flex justify-between text-sm"><span className="text-[#5f5f5f]">Información completada</span><span className="font-semibold text-[#111111]">{completion}%</span></div><Progress progress={completion} color="purple" /></div><div className="mt-5 flex flex-wrap gap-2"><Button className="glade-button" onClick={() => navigate(`/case/${caseData.id}`)}>Abrir expediente <AppIcon name="arrow-right" className="ml-2" /></Button></div></Card>;
          })}
          {!cases.length ? <Card className="border-dashed border-[var(--glade-border)] bg-white text-center shadow-none"><AppIcon name="document" size={34} className="mx-auto" /><p className="mt-3 font-semibold">Aún no hay solicitudes.</p><p className="mt-1 text-sm text-[#5f5f5f]">Inicia una para comenzar la plantilla guiada.</p></Card> : null}
        </div>
      </section>
    </div>
  );
}
