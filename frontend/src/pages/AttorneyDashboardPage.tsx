import { Badge, Button, Card, Label, Pagination, Select, TextInput } from "flowbite-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppIcon } from "../components/atoms/AppIcon";
import { ResponsiveDataView } from "../components/molecules/ResponsiveDataView";
import { STATUS_LABELS } from "../config/bankruptcyOptions";
import type { BankruptcyCase, CaseStatus } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../workspace/caseMetrics";

const PAGE_SIZE = 8;

function alertCount(caseData: BankruptcyCase): number {
  return Number(caseData.household.urgentCollectionAction) + caseData.debts.filter((debt) => debt.collectionLawsuit || debt.delinquentAmount > 0).length;
}

function isUrgent(caseData: BankruptcyCase): boolean {
  return caseData.household.urgentCollectionAction || caseData.debts.some((debt) => debt.collectionLawsuit);
}

/**
 * "Esperando cliente" has no dedicated CaseStatus value in the current
 * contract (see docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md) — derived
 * here from an open document request instead of a fabricated status. A
 * real status enum member is the more correct fix and would be a
 * coordinated frontend+backend contract change; documented, not hidden.
 */
function isWaitingOnClient(caseData: BankruptcyCase): boolean {
  return caseData.evidence.some((item) => item.status === "requested");
}

type ViewKey =
  | "all"
  | "new"
  | "incomplete"
  | "urgent"
  | "submitted"
  | "attorney_review"
  | "waiting_client"
  | "consultation_scheduled"
  | "decision_pending"
  | "closed";

const VIEWS: { key: ViewKey; label: string; match: (item: BankruptcyCase) => boolean }[] = [
  { key: "all", label: "Todos", match: () => true },
  { key: "new", label: "Nuevos", match: (item) => item.status === "draft" },
  { key: "incomplete", label: "Incompletos", match: (item) => localCompletion(item) < 100 },
  { key: "urgent", label: "Urgentes", match: isUrgent },
  { key: "submitted", label: "Enviados", match: (item) => item.status === "submitted" },
  { key: "attorney_review", label: "En revisión", match: (item) => item.status === "attorney_review" },
  { key: "waiting_client", label: "Esperando cliente", match: isWaitingOnClient },
  { key: "consultation_scheduled", label: "Consulta programada", match: (item) => item.status === "consultation_scheduled" },
  { key: "decision_pending", label: "Decisión pendiente", match: (item) => item.status === "decision_pending" },
  { key: "closed", label: "Cerrados", match: (item) => item.status === "closed" },
];

type SortKey = "name-asc" | "name-desc" | "completion-desc" | "completion-asc" | "urgent-first";

export function AttorneyDashboardPage() {
  const navigate = useNavigate();
  const { cases } = useBankruptcyWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewKey>("all");
  const [sort, setSort] = useState<SortKey>("urgent-first");
  const [page, setPage] = useState(1);
  const query = searchParams.get("q") ?? "";

  const submitted = cases.filter((item) => item.status !== "draft" && item.status !== "collecting_information");
  const urgent = cases.filter(isUrgent);
  const waitingOnClient = cases.filter(isWaitingOnClient);

  const searched = useMemo(() => {
    if (!query.trim()) return cases;
    const needle = query.trim().toLowerCase();
    return cases.filter((item) => item.clientName.toLowerCase().includes(needle) || item.clientEmail.toLowerCase().includes(needle));
  }, [cases, query]);

  const filtered = useMemo(() => {
    const matcher = VIEWS.find((item) => item.key === view)?.match ?? (() => true);
    return searched.filter(matcher);
  }, [searched, view]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "name-asc":
        return copy.sort((a, b) => a.clientName.localeCompare(b.clientName));
      case "name-desc":
        return copy.sort((a, b) => b.clientName.localeCompare(a.clientName));
      case "completion-asc":
        return copy.sort((a, b) => localCompletion(a) - localCompletion(b));
      case "completion-desc":
        return copy.sort((a, b) => localCompletion(b) - localCompletion(a));
      case "urgent-first":
      default:
        return copy.sort((a, b) => Number(isUrgent(b)) - Number(isUrgent(a)) || alertCount(b) - alertCount(a));
    }
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setView_ = (key: ViewKey) => {
    setView(key);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="pt-3">
          <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">Espacio del abogado</Badge>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl lg:text-[2.75rem]">Revisa solicitudes financieras antes de la consulta.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">Cada expediente resume presupuesto, deuda, bienes, evidencia y puntos que requieren análisis jurídico. El sistema mantiene visibles las urgencias sin recomendar un capítulo automáticamente.</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["document", "Solicitudes", cases.length],
          ["attorney", "En revisión", submitted.length],
          ["alert", "Con urgencia", urgent.length],
          ["evidence", "Esperando cliente", waitingOnClient.length],
        ].map(([icon, label, value]) => (
          <Card key={String(label)} className="metric-tile">
            <div className="flex items-center gap-4">
              <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-xl"><AppIcon name={icon as "document" | "attorney" | "alert" | "evidence"} /></span>
              <div><p className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">{value}</p><p className="mt-0.5 text-sm font-medium text-[var(--color-text-muted)]">{label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="app-card">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-700">Gestión de solicitudes</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">Bandeja de casos</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">Prioriza urgencias, faltantes y solicitudes enviadas.</p></div>
          <Badge color="gray" className="w-fit px-3 py-1.5">{sorted.length} de {cases.length} casos</Badge>
        </div>

        {/* Vistas / filtros */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {VIEWS.map((item) => {
            const count = searched.filter(item.match).length;
            const active = view === item.key;
            return (
              <Button key={item.key} size="xs" color={active ? "indigo" : "light"} className="shrink-0" onClick={() => setView_(item.key)}>
                {item.label} <Badge color={active ? "gray" : "indigo"} className="ml-1.5">{count}</Badge>
              </Button>
            );
          })}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Label htmlFor="attorney-search" className="sr-only">Buscar por cliente</Label>
            <TextInput
              id="attorney-search"
              className="app-input"
              placeholder="Buscar por nombre o correo…"
              value={query}
              onChange={(event) => {
                const next = event.target.value;
                setPage(1);
                setSearchParams(next ? { q: next } : {});
              }}
            />
          </div>
          <div className="sm:w-64">
            <Label htmlFor="attorney-sort" className="sr-only">Ordenar</Label>
            <Select id="attorney-sort" className="app-input" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="urgent-first">Más urgente primero</option>
              <option value="completion-desc">Avance: mayor a menor</option>
              <option value="completion-asc">Avance: menor a mayor</option>
              <option value="name-asc">Cliente A–Z</option>
              <option value="name-desc">Cliente Z–A</option>
            </Select>
          </div>
        </div>

        <ResponsiveDataView
          emptyMessage="Ningún caso coincide con este filtro o búsqueda."
          rows={pageItems}
          rowKey={(item) => item.id}
          renderActions={(item) => <Button size="sm" className="primary-action" onClick={() => navigate(`/case/${item.id}`)}>Revisar</Button>}
          columns={[
            { key: "client", header: "Cliente", hideLabelOnCard: true, render: (item) => <div><p className="font-semibold text-[var(--color-text)]">{item.clientName}</p><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.clientEmail}</p></div> },
            { key: "status", header: "Estado", render: (item) => <Badge color={item.status === "submitted" ? "success" : "gray"}>{STATUS_LABELS[item.status as CaseStatus]}</Badge> },
            { key: "completion", header: "Avance", render: (item) => <span className="font-semibold text-[var(--color-text)]">{localCompletion(item)}%</span> },
            { key: "alerts", header: "Alertas", render: (item) => <Badge color={alertCount(item) ? "failure" : "success"}>{alertCount(item)}</Badge> },
          ]}
        />

        {totalPages > 1 ? (
          <div className="mt-5 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
