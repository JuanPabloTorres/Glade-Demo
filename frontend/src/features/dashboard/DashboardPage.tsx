import { Alert, Badge, Button, Card, Progress, Spinner } from "flowbite-react";
import { AlertTriangle, CheckCircle2, Clock3, FolderKanban, Gauge, ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { useCases } from "../../hooks/useCases";
import { useDashboardSummary } from "../../hooks/useWorkspace";

export function DashboardPage() {
  const { t } = useTranslation();
  const summary = useDashboardSummary();
  const cases = useCases();

  if (summary.isLoading || cases.isLoading) return <div className="grid min-h-96 place-items-center"><Spinner size="xl" /></div>;
  if (summary.isError || cases.isError || !summary.data) return <Alert color="failure">{t("common.error")}</Alert>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t("dashboard.totalCases")} value={String(summary.data.total_cases)} icon={FolderKanban} />
        <StatCard label={t("dashboard.average")} value={`${summary.data.completion_average}%`} icon={Gauge} />
        <StatCard label={t("dashboard.ready")} value={String(summary.data.ready_for_review_cases)} icon={CheckCircle2} />
        <StatCard label={t("dashboard.inProgress")} value={String(summary.data.in_progress_cases)} icon={Clock3} />
        <StatCard label={t("dashboard.alerts")} value={String(summary.data.unresolved_alerts)} icon={AlertTriangle} />
        <StatCard label={t("dashboard.overdue")} value={String(summary.data.overdue_tasks)} icon={ListTodo} />
      </div>
      <Card>
        <div><h2 className="text-xl font-bold text-slate-900">{t("dashboard.recentCases")}</h2><p className="mt-1 text-sm text-slate-500">{t("dashboard.recentCasesSubtitle")}</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(cases.data || []).slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{new Date(item.updated_at).toLocaleDateString()}</p></div><Badge color="info">{t(`status.${item.status}`)}</Badge></div>
              <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-slate-500"><span>{t("common.progress")}</span><span>{item.progress}%</span></div><Progress progress={item.progress} /></div>
              <Link to={`/cases/${item.id}/workspace`} className="mt-4 block"><Button color="light" size="sm" className="w-full">{t("cases.details")}</Button></Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
