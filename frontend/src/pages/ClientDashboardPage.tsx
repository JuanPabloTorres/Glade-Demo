import { Alert, Badge, Card, Progress } from "flowbite-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { bankruptcyApi } from "../api/bankruptcyApi";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { CasePanel } from "../components/case/CasePanel";
import { InsightList } from "../components/case/InsightList";
import { MetricTiles } from "../components/case/MetricTiles";
import { CaseTimeline } from "../components/organisms/CaseTimeline";
import { CASE_SECTION, ROUTES } from "../config/routes";
import type { CaseAnalysis } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { localCompletion } from "../workspace/caseMetrics";

/**
 * The client's home.
 *
 * Reading order: where the case stands, the one thing to do next, then what is
 * outstanding, then the figures, then the history. That order has not changed —
 * what has is that each block is now a `CasePanel` composing `InsightList` /
 * `MetricTiles` rather than a bespoke `<Card>` with its own heading size,
 * border and bullet treatment. Six near-identical cards had already drifted
 * into four different heading sizes and three different list styles.
 *
 * The standalone "assistant" card is gone. It was a card-sized button that
 * opened the panel the floating launcher opens from every screen, including
 * this one — a second control for the same thing, taking a full column of a
 * two-column row. The contextual prompts inside each case section, which seed a
 * specific question, are what remain.
 *
 * Financial figures come from the same /bankruptcy/analyze call the case
 * workspace uses, so numbers never drift between the two screens.
 */
export function ClientDashboardPage() {
  const { t } = useTranslation(["workspace", "common"]);
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
      .catch(() => active && setAnalysisError(t("workspace:clientDashboard.analysisError")));
    return () => {
      active = false;
    };
  }, [activeCase, t]);

  const start = () => {
    if (!user) return;
    navigate(ROUTES.case(workspace.createCase(user)));
  };

  const firstName = user?.name.split(" ")[0] ?? "";
  const completion = activeCase ? localCompletion(activeCase) : 0;
  const requestedDocuments = activeCase?.evidence.filter((item) => item.status === "requested") ?? [];
  const nextStep = analysis?.next_steps?.[0];
  const recentEvents = activeCase?.timeline.slice(-3) ?? [];

  if (!activeCase) {
    return (
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="pt-3">
          <Badge color="indigo" className="mb-4 w-fit px-3 py-1.5">{t("workspace:clientDashboard.badges.portal")}</Badge>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-heading sm:text-4xl">
            {t("workspace:clientDashboard.empty.title", { name: firstName ? `, ${firstName}` : "" })}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-body">
            {t("workspace:clientDashboard.empty.description")}
          </p>
          <AppButton size="lg" className="primary-action mt-6" onClick={start}>
            <AppIcon name="arrow-right" className="mr-2" />
            {t("workspace:clientDashboard.empty.startRequest")}
          </AppButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting, status and progress — one block, because "how far along am
          I?" is part of "where does my case stand?" and splitting them put a
          card border between a question and its answer. */}
      <Card className="app-card relative overflow-hidden">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="grid gap-6 pt-3 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="indigo" className="w-fit px-3 py-1.5">{t("workspace:clientDashboard.badges.portal")}</Badge>
              <Badge color={activeCase.status === "submitted" ? "success" : "warning"}>{t(`workspace:status.${activeCase.status}`)}</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-heading sm:text-4xl">
              {t("workspace:clientDashboard.title", { name: firstName ? `, ${firstName}` : "" })}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-body">{activeCase.clientGoal || t("workspace:clientDashboard.goalFallback")}</p>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-body">{t("workspace:clientDashboard.completedInfo")}</span>
              <span className="font-semibold text-heading">{completion}%</span>
            </div>
            <Progress progress={completion} color="indigo" size="lg" />
          </div>
        </div>
      </Card>

      {/* The one next action, kept visually distinct from the panels below it —
          it is the only thing on this screen the client is asked to act on. */}
      <Card className="app-card border-l-4 border-l-indigo-600">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><AppIcon name="arrow-right" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-brand">{t("workspace:clientDashboard.nextAction")}</p>
              <p className="mt-1 font-semibold text-heading">
                {nextStep ?? t("workspace:clientDashboard.nextActionFallback")}
              </p>
            </div>
          </div>
          <AppButton className="primary-action shrink-0" onClick={() => navigate(ROUTES.caseSection(activeCase.id, CASE_SECTION.overview))}>
            {t("common:actions.continue")} <AppIcon name="arrow-right" className="ml-2" />
          </AppButton>
        </div>
      </Card>

      {analysisError ? <Alert color="failure">{analysisError}</Alert> : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CasePanel icon="tasks" title={t("workspace:clientDashboard.pendingTasks")}>
          <InsightList
            items={analysis?.missing_items ?? []}
            tone="warning"
            limit={5}
            emptyMessage={t("workspace:clientDashboard.noPendingTasks")}
          />
        </CasePanel>

        <CasePanel icon="document" title={t("workspace:clientDashboard.requestedDocuments")}>
          {requestedDocuments.length ? (
            <ul className="space-y-2">
              {requestedDocuments.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-secondary-soft p-3 text-sm">
                  <AppIcon name="document" size={16} className="shrink-0 text-body" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <Badge color="warning">{t("workspace:clientDashboard.pendingBadge")}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-body">{t("workspace:clientDashboard.noRequestedDocuments")}</p>
          )}
        </CasePanel>
      </div>

      <CasePanel icon="calculator" title={t("workspace:clientDashboard.financialSummary")}>
        <MetricTiles
          columns={3}
          tiles={[
            { id: "net-income", label: t("workspace:clientDashboard.metrics.netIncome"), value: analysis?.monthly_net_income ?? 0 },
            { id: "expenses", label: t("workspace:clientDashboard.metrics.monthlyExpenses"), value: analysis?.monthly_expenses ?? 0 },
            { id: "cash-flow", label: t("workspace:clientDashboard.metrics.availableCashFlow"), value: analysis?.monthly_cash_flow ?? 0 },
          ]}
        />
      </CasePanel>

      <CasePanel
        icon="activity"
        title={t("workspace:clientDashboard.recentActivity")}
        action={
          <AppButton color="light" size="xs" onClick={() => navigate(ROUTES.caseSection(activeCase.id, CASE_SECTION.activity))}>
            {t("workspace:clientDashboard.viewFullCase")}
          </AppButton>
        }
      >
        {recentEvents.length ? (
          <CaseTimeline events={recentEvents} />
        ) : (
          <p className="text-sm leading-6 text-body">{t("workspace:clientDashboard.noRecentActivity")}</p>
        )}
      </CasePanel>

      {cases.length > 1 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-heading">{t("workspace:clientDashboard.otherRequests")}</h2>
            <Badge color="gray" className="px-3 py-1.5">{cases.length}</Badge>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {cases.slice(1).map((caseData) => (
              <Card key={caseData.id} className="app-card interactive-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-heading">{caseData.clientName}</p>
                    <p className="mt-1 text-sm text-body">{caseData.clientGoal || t("workspace:clientDashboard.goalShortFallback")}</p>
                  </div>
                  <Badge color={caseData.status === "submitted" ? "success" : "warning"}>{t(`workspace:status.${caseData.status}`)}</Badge>
                </div>
                <AppButton className="primary-action mt-4" onClick={() => navigate(ROUTES.case(caseData.id))}>
                  {t("common:actions.open")} <AppIcon name="arrow-right" className="ml-2" />
                </AppButton>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <AppButton color="light" size="sm" onClick={start}>
          <AppIcon name="brand" size={16} className="mr-2" />
          {t("workspace:clientDashboard.startAnother")}
        </AppButton>
      </div>
    </div>
  );
}
