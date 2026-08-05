import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useNavigate } from "react-router";
import { AppIcon } from "../components/atoms/AppIcon";
import { STATUS_LABELS } from "../config/bankruptcyOptions";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../workspace/caseMetrics";

export function AttorneyDashboardPage() {
  const navigate = useNavigate();
  const { cases } = useBankruptcyWorkspace();
  const submitted = cases.filter((item) => item.status !== "draft" && item.status !== "collecting_information");
  const urgent = cases.filter((item) => item.household.urgentCollectionAction || item.debts.some((debt) => debt.collectionLawsuit));

  return (
    <div className="space-y-8">
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="pt-3">
          <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">Espacio del abogado</Badge>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--glade-black)] sm:text-4xl lg:text-[2.75rem]">Revisa solicitudes financieras antes de la consulta.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--glade-muted)]">Cada expediente resume presupuesto, deuda, bienes, evidencia y puntos que requieren análisis jurídico. El sistema mantiene visibles las urgencias sin recomendar un capítulo automáticamente.</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["document", "Solicitudes", cases.length],
          ["attorney", "En revisión", submitted.length],
          ["alert", "Con urgencia", urgent.length],
        ].map(([icon, label, value]) => (
          <Card key={String(label)} className="metric-tile">
            <div className="flex items-center gap-4">
              <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-xl"><AppIcon name={icon as "document" | "attorney" | "alert"} /></span>
              <div><p className="text-3xl font-semibold tracking-[-0.03em] text-[var(--glade-black)]">{value}</p><p className="mt-0.5 text-sm font-medium text-[var(--glade-muted)]">{label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="app-card">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-700">Gestión de solicitudes</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--glade-black)]">Bandeja de casos</h2><p className="mt-2 text-sm text-[var(--glade-muted)]">Prioriza urgencias, faltantes y solicitudes enviadas.</p></div>
          <Badge color="gray" className="w-fit px-3 py-1.5">{cases.length} casos</Badge>
        </div>

        <div className="app-table overflow-x-auto rounded-xl border border-[var(--glade-border)]">
          <Table hoverable>
            <TableHead>
              <TableRow><TableHeadCell>Cliente</TableHeadCell><TableHeadCell>Estado</TableHeadCell><TableHeadCell>Avance</TableHeadCell><TableHeadCell>Alertas</TableHeadCell><TableHeadCell><span className="sr-only">Abrir</span></TableHeadCell></TableRow>
            </TableHead>
            <TableBody className="divide-y divide-[var(--glade-border)]">
              {cases.map((caseData) => {
                const alerts = Number(caseData.household.urgentCollectionAction) + caseData.debts.filter((debt) => debt.collectionLawsuit || debt.delinquentAmount > 0).length;
                return (
                  <TableRow key={caseData.id} className="bg-white">
                    <TableCell><p className="font-semibold text-[var(--glade-black)]">{caseData.clientName}</p><p className="mt-0.5 text-xs text-[var(--glade-muted)]">{caseData.clientEmail}</p></TableCell>
                    <TableCell><Badge color={caseData.status === "submitted" ? "success" : "gray"}>{STATUS_LABELS[caseData.status]}</Badge></TableCell>
                    <TableCell><span className="font-semibold text-[var(--glade-black)]">{localCompletion(caseData)}%</span></TableCell>
                    <TableCell><Badge color={alerts ? "failure" : "success"}>{alerts}</Badge></TableCell>
                    <TableCell><Button size="sm" className="primary-action" onClick={() => navigate(`/case/${caseData.id}`)}>Revisar</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
