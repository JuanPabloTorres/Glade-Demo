import {
  Badge,
  Card,
  Pagination,
} from "flowbite-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { DataTableToolbar } from "../components/data-display/DataTableToolbar";
import { RowActionsMenu } from "../components/data-display/RowActionsMenu";
import { ConfirmDialog } from "../components/feedback/ConfirmDialog";
import { ResponsiveDataView } from "../components/molecules/ResponsiveDataView";
import { AppButton } from "../components/ui/AppButton";
import type { BankruptcyCase, CaseStatus } from "../types/bankruptcy";
import { useConfirmation } from "../hooks/useConfirmation";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../workspace/caseMetrics";

const PAGE_SIZE_OPTIONS = [5, 8, 12, 20] as const;

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

type SortKey = "name-asc" | "name-desc" | "completion-desc" | "completion-asc" | "urgent-first";

export function AttorneyDashboardPage() {
  const { t } = useTranslation(["workspace", "tables"]);
  const navigate = useNavigate();
  const auth = useAuth();
  const { cases, updateCase, deleteCase, createCase } = useBankruptcyWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  // `view` is derived from the URL on every render (not a one-time lazy
  // useState initializer) so sidebar deep links (?view=urgent,
  // ?view=waiting_client) re-filter the list even when React Router doesn't
  // remount this component — e.g. clicking a second sidebar filter link
  // while already on this route only changes the query string, not the
  // path, so no remount occurs and a lazy initializer would never re-read
  // the new `view` param. Mirrors the `q` search param, already URL-driven.
  const view = useMemo<ViewKey>(() => (searchParams.get("view") as ViewKey) || "all", [searchParams]);
  const [sort, setSort] = useState<SortKey>("urgent-first");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(8);
  const deleteConfirmation = useConfirmation<string>();
  const query = searchParams.get("q") ?? "";

  const submitted = cases.filter((item) => item.status !== "draft" && item.status !== "collecting_information");
  const urgent = cases.filter(isUrgent);
  const waitingOnClient = cases.filter(isWaitingOnClient);

  const views: { key: ViewKey; label: string; match: (item: BankruptcyCase) => boolean }[] = useMemo(
    () => [
      { key: "all", label: t("workspace:attorneyDashboard.views.all"), match: () => true },
      { key: "new", label: t("workspace:attorneyDashboard.views.new"), match: (item) => item.status === "draft" },
      { key: "incomplete", label: t("workspace:attorneyDashboard.views.incomplete"), match: (item) => localCompletion(item) < 100 },
      { key: "urgent", label: t("workspace:attorneyDashboard.views.urgent"), match: isUrgent },
      { key: "submitted", label: t("workspace:attorneyDashboard.views.submitted"), match: (item) => item.status === "submitted" },
      { key: "attorney_review", label: t("workspace:attorneyDashboard.views.attorneyReview"), match: (item) => item.status === "attorney_review" },
      { key: "waiting_client", label: t("workspace:attorneyDashboard.views.waitingClient"), match: isWaitingOnClient },
      { key: "consultation_scheduled", label: t("workspace:attorneyDashboard.views.consultationScheduled"), match: (item) => item.status === "consultation_scheduled" },
      { key: "decision_pending", label: t("workspace:attorneyDashboard.views.decisionPending"), match: (item) => item.status === "decision_pending" },
      { key: "closed", label: t("workspace:attorneyDashboard.views.closed"), match: (item) => item.status === "closed" },
    ],
    [t],
  );

  const searched = useMemo(() => {
    if (!query.trim()) return cases;
    const needle = query.trim().toLowerCase();
    return cases.filter((item) => item.clientName.toLowerCase().includes(needle) || item.clientEmail.toLowerCase().includes(needle));
  }, [cases, query]);

  const filtered = useMemo(() => {
    const matcher = views.find((item) => item.key === view)?.match ?? (() => true);
    return searched.filter(matcher);
  }, [searched, view, views]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const setView_ = (key: ViewKey) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("view");
    else next.set("view", key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSort("urgent-first");
    setPage(1);
    setSearchParams({});
  };

  const startNewCase = () => {
    if (!auth.user) return;
    navigate(`/case/${createCase(auth.user)}`);
  };

  const askDelete = (caseId: string) => deleteConfirmation.request(caseId);

  const confirmDelete = async () => {
    await deleteConfirmation.run(async (caseId) => {
      deleteCase(caseId);
    });
  };

  return (
    <div className="space-y-8">
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="pt-3">
          <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">{t("workspace:attorneyDashboard.attorneySpace")}</Badge>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl lg:text-[2.75rem]">{t("workspace:attorneyDashboard.heroTitle")}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">{t("workspace:attorneyDashboard.heroDescription")}</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["document", t("workspace:attorneyDashboard.metrics.requests"), cases.length],
          ["attorney", t("workspace:attorneyDashboard.metrics.inReview"), submitted.length],
          ["alert", t("workspace:attorneyDashboard.metrics.urgent"), urgent.length],
          ["evidence", t("workspace:attorneyDashboard.metrics.waitingClient"), waitingOnClient.length],
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
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-brand">{t("workspace:attorneyDashboard.managementLabel")}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">{t("workspace:attorneyDashboard.inboxTitle")}</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("workspace:attorneyDashboard.inboxDescription")}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray" className="w-fit px-3 py-1.5">{t("workspace:attorneyDashboard.caseCount", { shown: sorted.length, total: cases.length })}</Badge>
            <AppButton className="primary-action" size="sm" onClick={startNewCase} iconLeft="document">
              {t("workspace:attorneyDashboard.createCase")}
            </AppButton>
          </div>
        </div>

        {/* Vistas / filtros */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {views.map((item) => {
            const count = searched.filter(item.match).length;
            const active = view === item.key;
            return (
              <AppButton key={item.key} size="xs" color={active ? "indigo" : "light"} className="shrink-0" onClick={() => setView_(item.key)}>
                {item.label} <Badge color={active ? "gray" : "indigo"} className="ml-1.5">{count}</Badge>
              </AppButton>
            );
          })}
        </div>

        <DataTableToolbar
          query={query}
          sort={sort}
          pageSize={pageSize}
          searchPlaceholder={t("workspace:attorneyDashboard.searchPlaceholder")}
          sortOptions={[
            { value: "urgent-first", label: t("workspace:attorneyDashboard.sort.urgentFirst") },
            { value: "completion-desc", label: t("workspace:attorneyDashboard.sort.completionDesc") },
            { value: "completion-asc", label: t("workspace:attorneyDashboard.sort.completionAsc") },
            { value: "name-asc", label: t("workspace:attorneyDashboard.sort.nameAsc") },
            { value: "name-desc", label: t("workspace:attorneyDashboard.sort.nameDesc") },
          ]}
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onQueryChange={(next) => {
            setPage(1);
            setSearchParams(next ? { q: next } : {});
          }}
          onSortChange={(next) => setSort(next as SortKey)}
          onPageSizeChange={(next) => {
            setPage(1);
            setPageSize(next as (typeof PAGE_SIZE_OPTIONS)[number]);
          }}
          onClearFilters={clearFilters}
        />

        <ResponsiveDataView
          emptyMessage={t("workspace:attorneyDashboard.emptyMessage")}
          rows={pageItems}
          rowKey={(item) => item.id}
          renderActions={(item) => (
            <RowActionsMenu
              onView={() => navigate(`/case/${item.id}`)}
              actions={[
                { label: t("common:actions.view"), onClick: () => navigate(`/case/${item.id}`) },
                {
                  label: item.household.urgentCollectionAction ? t("workspace:attorneyDashboard.actions.deactivateUrgent") : t("workspace:attorneyDashboard.actions.activateUrgent"),
                  onClick: () => {
                    updateCase(item.id, (current) => ({
                      ...current,
                      household: {
                        ...current.household,
                        urgentCollectionAction: !current.household.urgentCollectionAction,
                      },
                    }));
                  },
                },
                { label: t("common:actions.delete"), onClick: () => askDelete(item.id) },
              ]}
            />
          )}
          columns={[
            { key: "client", header: t("workspace:attorneyDashboard.columns.client"), hideLabelOnCard: true, render: (item) => <div><p className="font-semibold text-[var(--color-text)]">{item.clientName}</p><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.clientEmail}</p></div> },
            { key: "status", header: t("workspace:attorneyDashboard.columns.status"), render: (item) => <Badge color={item.status === "submitted" ? "success" : "gray"}>{t(`workspace:status.${item.status as CaseStatus}`)}</Badge> },
            { key: "completion", header: t("workspace:attorneyDashboard.columns.completion"), render: (item) => <span className="font-semibold text-[var(--color-text)]">{localCompletion(item)}%</span> },
            { key: "alerts", header: t("workspace:attorneyDashboard.columns.alerts"), render: (item) => <Badge color={alertCount(item) ? "failure" : "success"}>{alertCount(item)}</Badge> },
          ]}
        />

        {totalPages > 1 ? (
          <div className="mt-5 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={deleteConfirmation.isOpen}
        title={t("workspace:attorneyDashboard.confirmDelete.title")}
        message={t("workspace:attorneyDashboard.confirmDelete.message")}
        confirmLabel={t("workspace:attorneyDashboard.confirmDelete.confirm")}
        destructive
        busy={deleteConfirmation.busy}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
