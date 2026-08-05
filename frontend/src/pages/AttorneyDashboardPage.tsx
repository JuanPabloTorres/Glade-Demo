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
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-[var(--glade-border)] bg-white shadow-sm"><div className="glade-gradient absolute inset-x-0 top-0 h-1.5" /><div className="pt-3"><Badge color="gray" className="mb-4 w-fit">Espacio del abogado</Badge><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#111111] sm:text-4xl">Revisa solicitudes financieras antes de la consulta.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-[#5f5f5f]">Cada expediente resume presupuesto, deuda, bienes, evidencia y puntos que requieren análisis jurídico. El sistema no recomienda un capítulo automáticamente.</p></div></Card>
      <div className="grid gap-4 sm:grid-cols-3">{[
        ["document", "Solicitudes", cases.length],
        ["attorney", "En revisión", submitted.length],
        ["alert", "Con urgencia", urgent.length],
      ].map(([icon, label, value]) => <Card key={String(label)} className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--glade-surface)]"><AppIcon name={icon as "document" | "attorney" | "alert"} /></span><div><p className="text-2xl font-semibold text-[#111111]">{value}</p><p className="text-sm text-[#5f5f5f]">{label}</p></div></div></Card>)}</div>
      <Card className="border border-[var(--glade-border)] bg-white shadow-sm"><div className="mb-5"><h2 className="text-xl font-semibold text-[#111111]">Bandeja de casos</h2><p className="mt-1 text-sm text-[#5f5f5f]">Prioriza urgencias, faltantes y solicitudes enviadas.</p></div><div className="overflow-x-auto"><Table hoverable><TableHead><TableRow><TableHeadCell>Cliente</TableHeadCell><TableHeadCell>Estado</TableHeadCell><TableHeadCell>Avance</TableHeadCell><TableHeadCell>Alertas</TableHeadCell><TableHeadCell><span className="sr-only">Abrir</span></TableHeadCell></TableRow></TableHead><TableBody className="divide-y">{cases.map((caseData) => { const alerts = Number(caseData.household.urgentCollectionAction) + caseData.debts.filter((debt) => debt.collectionLawsuit || debt.delinquentAmount > 0).length; return <TableRow key={caseData.id} className="bg-white"><TableCell><p className="font-semibold text-[#111111]">{caseData.clientName}</p><p className="text-xs text-[#777]">{caseData.clientEmail}</p></TableCell><TableCell><Badge color={caseData.status === "submitted" ? "success" : "gray"}>{STATUS_LABELS[caseData.status]}</Badge></TableCell><TableCell>{localCompletion(caseData)}%</TableCell><TableCell><Badge color={alerts ? "failure" : "success"}>{alerts}</Badge></TableCell><TableCell><Button size="xs" color="dark" onClick={() => navigate(`/case/${caseData.id}`)}>Revisar</Button></TableCell></TableRow>; })}</TableBody></Table></div></Card>
    </div>
  );
}
