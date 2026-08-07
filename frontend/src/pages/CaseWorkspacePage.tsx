import {
  Alert,
  Badge,
  Card,
  Checkbox,
  Label,
  Progress,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { bankruptcyApi } from "../api/bankruptcyApi";
import { useAuth } from "../auth/AuthContext";
import { useChatPanel } from "../chat/ChatPanelContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { BankruptcyEntryModal } from "../components/organisms/BankruptcyEntryModal";
import { CaseActionBar } from "../components/organisms/CaseActionBar";
import { CaseTimeline } from "../components/organisms/CaseTimeline";
import { CaseStageStepper } from "../components/molecules/CaseStageStepper";
import { ResponsiveDataView } from "../components/molecules/ResponsiveDataView";
import { StageOrientation } from "../components/molecules/StageOrientation";
import { ROUTES } from "../config/routes";
import type {
  BankruptcyCase,
  CaseAnalysis,
  CaseStatus,
  EntryKind,
  EntrySubmission,
} from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { currency, localCompletion, monthlyAmount } from "../workspace/caseMetrics";
import { formatDate } from "../i18n/format";

/**
 * Stable, position-independent identifiers for every stage of the workspace.
 * This is the single source of truth for "which stage is active" — nothing
 * else in this file encodes a stage as a positional number. The stepper's
 * displayed index (see CaseStageStepper) is always *derived* from a stage's
 * position in `BASE_STAGE_ORDER` (see STAGE_ORDER below), never hardcoded,
 * so reordering a stage in `BASE_STAGE_ORDER` can never desync a shortcut or
 * deep-link from the stage it's supposed to open.
 */
export type CaseStage =
  | "start"
  | "household"
  | "income"
  | "expenses"
  | "debts"
  | "assets"
  | "documents"
  | "review"
  | "submitted"
  | "tracking"
  | "attorney-review";

/**
 * Order of the always-present stages, matching the stage-content order
 * below. "attorney-review" is appended conditionally (only attorneys get
 * that stage) — see STAGE_ORDER in the component body, which is the only
 * place that adds it.
 */
export const BASE_STAGE_ORDER: readonly CaseStage[] = [
  "start",
  "household",
  "income",
  "expenses",
  "debts",
  "assets",
  "documents",
  "review",
  "submitted",
  "tracking",
];

/**
 * Translates the backend's `GuidanceResponseDto.focus_section` vocabulary
 * (see ChatPanel.tsx, which builds `?focus=<value>`) into a canonical
 * `CaseStage`. This is a vocabulary alias, not a position map — it never
 * encodes an index, so it can't go stale when stages are reordered.
 */
/**
 * The query parameter that carries the active stage. Named `focus` for
 * backward compatibility with links the assistant already builds
 * (ChatPanel.tsx) and with any bookmarked URL.
 */
export const STAGE_QUERY_PARAM = "focus";

export const FOCUS_PARAM_TO_STAGE: Record<string, CaseStage> = {
  overview: "start",
  household: "household",
  "income-expenses": "income",
  "debts-assets": "debts",
  evidence: "documents",
  review: "review",
  timeline: "tracking",
  "attorney-review": "attorney-review",
  "chapter-comparison": "start",
};

/**
 * Maps every `CaseStage` to its i18n key — the single, stable place that
 * associates a stage identity with its display label. Looked up by stage
 * key (not by array position), so it can never go stale when
 * `BASE_STAGE_ORDER` is reordered. Reuses the existing `workspace:tabs.*`
 * keys (see locales/<lang>/workspace.json) rather than introducing new ones for
 * the same 10 labels.
 */
export const STAGE_LABEL_KEYS: Record<CaseStage, string> = {
  start: "workspace:tabs.start",
  household: "workspace:tabs.household",
  income: "workspace:tabs.income",
  expenses: "workspace:tabs.expenses",
  debts: "workspace:tabs.debts",
  assets: "workspace:tabs.assets",
  documents: "workspace:tabs.documents",
  review: "workspace:tabs.review",
  submitted: "workspace:tabs.submitted",
  tracking: "workspace:tabs.tracking",
  "attorney-review": "workspace:tabs.attorneyReview",
};

function statusColor(status: CaseStatus): "gray" | "warning" | "success" | "info" {
  if (status === "submitted" || status === "attorney_review") return "warning";
  if (status === "consultation_scheduled" || status === "filing_preparation") return "info";
  if (status === "closed") return "success";
  return "gray";
}

export function CaseWorkspacePage() {
  const { t } = useTranslation(["workspace", "common"]);
  const { caseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const { openChat } = useChatPanel();
  const caseData = workspace.cases.find((item) => item.id === caseId);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<EntryKind | null>(null);
  const isAttorney = user?.role === "attorney";

  // The attorney-review stage content only renders for attorneys (JSX
  // below), so it only belongs in STAGE_ORDER for that role — this is the
  // one place that appends it, so the stepper's index always matches what's
  // actually rendered.
  const STAGE_ORDER = useMemo<CaseStage[]>(
    () => (isAttorney ? [...BASE_STAGE_ORDER, "attorney-review"] : [...BASE_STAGE_ORDER]),
    [isAttorney],
  );

  /**
   * The active stage is read from the URL, never stored beside it. That is
   * what lets a refresh, a shared link and the browser Back button all resolve
   * to the same stage, and it is what allows the sidebar / bottom-nav entries
   * that point at a stage to recognise themselves as active.
   *
   * Two vocabularies resolve here: the canonical `CaseStage` keys this app
   * writes, and the backend's `focus_section` aliases (see
   * FOCUS_PARAM_TO_STAGE) that arrive on links built by the assistant. An
   * unknown or missing value falls back to the first stage.
   */
  const activeStage = useMemo<CaseStage>(() => {
    const raw = searchParams.get(STAGE_QUERY_PARAM);
    if (!raw) return "start";
    const candidate = (STAGE_ORDER as string[]).includes(raw)
      ? (raw as CaseStage)
      : FOCUS_PARAM_TO_STAGE[raw];
    return candidate && STAGE_ORDER.includes(candidate) ? candidate : "start";
  }, [searchParams, STAGE_ORDER]);

  // Every navigation — user clicks and URL deep-links alike — goes through
  // this single function. It writes the stage to the URL and nothing else;
  // `activeStage` is *derived* from that URL above, so there is one source of
  // truth rather than a state variable racing the address bar.
  const navigateToStage = useCallback(
    (stage: CaseStage) => {
      const target = STAGE_ORDER.includes(stage) ? stage : "start";
      const next = new URLSearchParams(searchParams);
      next.set(STAGE_QUERY_PARAM, target);
      // push, not replace: moving between stages is navigation the user
      // expects the browser Back button to undo.
      setSearchParams(next);
    },
    [STAGE_ORDER, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!caseData) return;
    let active = true;
    setAnalysisError(null);
    bankruptcyApi
      .analyze(caseData)
      .then((result) => active && setAnalysis(result))
      .catch(() => active && setAnalysisError(t("workspace:header.analysisError")));
    return () => {
      active = false;
    };
  }, [caseData, t]);

  // No effect syncs the URL into state any more: `activeStage` is computed
  // from `searchParams` on every render (see above), which is what makes a
  // direct refresh and the browser Back/Forward buttons land on the right
  // stage. The previous version read `?focus=` once, copied it into component
  // state and then deleted it from the URL — so the address bar forgot the
  // section, a refresh always reset to "start", Back never moved between
  // stages, and no navigation control could mark itself active because the
  // destination it linked to no longer matched the URL.

  if (!caseData || !user) return <Navigate to={ROUTES.home} replace />;
  if (user.role === "client" && caseData.ownerUserId !== user.id) return <Navigate to={ROUTES.home} replace />;

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

  const markUrgent = () =>
    update((current) => ({ ...current, household: { ...current.household, urgentCollectionAction: !current.household.urgentCollectionAction } }));

  const completion = analysis?.completion_score ?? localCompletion(caseData);
  const isSubmitted = caseData.status !== "draft" && caseData.status !== "collecting_information";
  // Derived from STAGE_ORDER (via the stage-key → i18n-key map STAGE_LABEL_KEYS)
  // rather than a separately hand-maintained list, so it always has exactly
  // as many titles as STAGE_ORDER has stages — including "attorney-review"
  // when present — and can never drift out of sync with it.
  const stageStepperTitles = STAGE_ORDER.map((stage) => t(STAGE_LABEL_KEYS[stage]));

  const householdComplete = Boolean(caseData.household.maritalStatus && caseData.household.housingStatus);
  // required_evidence is free-text Spanish guidance from the backend (e.g.
  // "Talones de pago de los últimos 60 días"), while evidence.evidenceType
  // stores the canonical slug (e.g. "pay-stubs") — match against the
  // translated label, not the slug, or every requirement reads as missing.
  const requiredEvidencePresent = (requirement: string) =>
    caseData.evidence.some((item) => {
      const label = t(`workspace:entryModal.evidenceTypes.${item.evidenceType}`).toLowerCase();
      return requirement.toLowerCase().split(" ").some((word) => word.length > 5 && label.includes(word));
    });
  const requiredEvidence = analysis?.required_evidence ?? [];
  const missingEvidenceCount = requiredEvidence.filter((item) => !requiredEvidencePresent(item)).length;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border border-[var(--color-border)] bg-white shadow-sm">
        <div className="glade-gradient absolute inset-x-0 top-0 h-1.5" />
        <div className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AppButton color="light" size="xs" onClick={() => navigate(ROUTES.home)}>← {t("workspace:header.back")}</AppButton>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge color={statusColor(caseData.status)}>{t(`workspace:status.${caseData.status}`)}</Badge>
              {caseData.household.urgentCollectionAction ? <Badge color="failure">{t("workspace:header.urgentAttention")}</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">{caseData.clientName}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">
              {caseData.clientGoal || t("workspace:header.goalFallback")}
            </p>
          </div>
          <div className="min-w-64 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">{t("workspace:header.preparation")}</span>
              <span data-testid="completion-score" className="text-2xl font-semibold text-[var(--color-text)]">{completion}%</span>
            </div>
            <Progress progress={completion} color="purple" className="mt-3" />
            {!isAttorney && caseData.status !== "submitted" ? (
              <AppButton className="glade-button mt-4 w-full" onClick={() => workspace.submitCase(caseData.id)}>{t("workspace:header.submitToAttorney")}</AppButton>
            ) : null}
          </div>
        </div>
      </Card>

      {analysisError ? <Alert color="failure">{analysisError || t("workspace:header.analysisError")}</Alert> : null}

      {isAttorney ? (
        <Card className="app-card">
          <p className="text-label mb-3 text-fg-brand">{t("workspace:actions.caseActions")}</p>
          <CaseActionBar
            caseData={caseData}
            analysis={analysis}
            onUpdate={update}
            onMarkUrgent={markUrgent}
            onOpenAttorneyReviewTab={() => navigateToStage("attorney-review")}
          />
        </Card>
      ) : null}

      {/*
        Single source of truth for stage navigation — see CaseStageStepper's
        own docblock. Rendered for both roles: attorneys need to browse every
        stage during review, not just jump to "attorney-review" via the
        CaseActionBar shortcut, and this is now the ONLY stage-navigation
        control in the page (Flowbite's uncontrolled Tabs — and the
        tabsRef/isSyncingTabsRef imperative-sync workaround it required — has
        been removed entirely; stage content below renders conditionally on
        `activeStage` instead of inside `TabItem`s).
      */}
      <CaseStageStepper
        stages={stageStepperTitles}
        currentIndex={Math.max(0, STAGE_ORDER.indexOf(activeStage))}
        onSelect={(index) => navigateToStage(STAGE_ORDER[index] ?? "start")}
      />

      <div className="workspace-stage-content">
        {activeStage === "start" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [t("workspace:caseWorkspace.metrics.netIncome"), analysis?.monthly_net_income ?? 0],
                  [t("workspace:caseWorkspace.metrics.monthlyExpenses"), analysis?.monthly_expenses ?? 0],
                  [t("workspace:caseWorkspace.metrics.availableCashFlow"), analysis?.monthly_cash_flow ?? 0],
                  [t("workspace:caseWorkspace.metrics.totalDebt"), analysis?.total_debt ?? 0],
                ].map(([label, value]) => (
                  <Card key={String(label)} className="border border-[var(--color-border)] bg-white shadow-none">
                    <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{currency(Number(value))}</p>
                  </Card>
                ))}
              </div>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.nextStepsTitle")}</h2>
                <div className="mt-4 space-y-3">
                  {(analysis?.next_steps ?? [t("workspace:caseWorkspace.nextStepsFallback")]).map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <span className="glade-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{index + 1}</span>
                      <p className="text-sm leading-6 text-[var(--color-text-muted)]">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
              {analysis?.warnings.length ? (
                <Card className="border border-[#f8d3d1] bg-[#fff7f6] shadow-none">
                  <div className="flex items-center gap-2"><AppIcon name="alert" className="text-[#f85e59]" /><h2 className="font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.warningsTitle")}</h2></div>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">{analysis.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
                </Card>
              ) : null}
            </div>
            <div className="space-y-5">
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.discussionPointsTitle")}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">{analysis?.discussion_points.map((point) => <li key={point}>• {point}</li>)}</ul>
              </Card>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.chapterComparisonTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.chapterComparisonDescription")}</p>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><p className="font-semibold">{t("workspace:caseWorkspace.chapter7")}</p><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">{analysis?.chapter_7_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div>
                  <div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><p className="font-semibold">{t("workspace:caseWorkspace.chapter13")}</p><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">{analysis?.chapter_13_questions.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {activeStage === "household" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.householdTitle")}
            description={t("workspace:stages.householdDescription")}
            estimatedMinutes={3}
            percentComplete={householdComplete ? 100 : 0}
            missingItems={householdComplete ? [] : [t("workspace:caseWorkspace.householdMissing.maritalStatus"), t("workspace:caseWorkspace.householdMissing.housingStatus")]}
            example={t("workspace:caseWorkspace.householdExample")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.household"))}
          />
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <div className="grid gap-5 lg:grid-cols-2">
              <div><Label htmlFor="client-name">{t("workspace:caseWorkspace.fields.name")}</Label><TextInput id="client-name" value={caseData.clientName} onChange={(event) => update((current) => ({ ...current, clientName: event.target.value }))} /></div>
              <div><Label htmlFor="client-email">{t("workspace:caseWorkspace.fields.email")}</Label><TextInput id="client-email" type="email" value={caseData.clientEmail} onChange={(event) => update((current) => ({ ...current, clientEmail: event.target.value }))} /></div>
              <div><Label htmlFor="client-phone">{t("workspace:caseWorkspace.fields.phone")}</Label><TextInput id="client-phone" value={caseData.clientPhone ?? ""} onChange={(event) => update((current) => ({ ...current, clientPhone: event.target.value }))} /></div>
              <div><Label htmlFor="municipality">{t("workspace:caseWorkspace.fields.municipality")}</Label><TextInput id="municipality" value={caseData.household.municipality ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, municipality: event.target.value } }))} /></div>
              <div>
                <Label htmlFor="marital-status">{t("workspace:caseWorkspace.fields.maritalStatus")}</Label>
                <Select id="marital-status" value={caseData.household.maritalStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, maritalStatus: event.target.value } }))}>
                  <option value="">{t("workspace:caseWorkspace.fields.select")}</option><option value="single">{t("workspace:caseWorkspace.maritalStatus.single")}</option><option value="married">{t("workspace:caseWorkspace.maritalStatus.married")}</option><option value="separated">{t("workspace:caseWorkspace.maritalStatus.separated")}</option><option value="divorced">{t("workspace:caseWorkspace.maritalStatus.divorced")}</option><option value="widowed">{t("workspace:caseWorkspace.maritalStatus.widowed")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="housing-status">{t("workspace:caseWorkspace.fields.housing")}</Label>
                <Select id="housing-status" value={caseData.household.housingStatus ?? ""} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, housingStatus: event.target.value } }))}>
                  <option value="">{t("workspace:caseWorkspace.fields.select")}</option><option value="rent">{t("workspace:caseWorkspace.housingStatus.rent")}</option><option value="own">{t("workspace:caseWorkspace.housingStatus.own")}</option><option value="own-free">{t("workspace:caseWorkspace.housingStatus.ownFree")}</option><option value="family">{t("workspace:caseWorkspace.housingStatus.family")}</option><option value="other">{t("workspace:caseWorkspace.housingStatus.other")}</option>
                </Select>
              </div>
              <div><Label htmlFor="household-size">{t("workspace:caseWorkspace.fields.householdSize")}</Label><TextInput id="household-size" type="number" min="1" value={caseData.household.householdSize} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, householdSize: Number(event.target.value) } }))} /></div>
              <div><Label htmlFor="dependents">{t("workspace:caseWorkspace.fields.dependents")}</Label><TextInput id="dependents" type="number" min="0" value={caseData.household.dependents} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, dependents: Number(event.target.value) } }))} /></div>
            </div>
            <div className="mt-5"><Label htmlFor="client-goal">{t("workspace:caseWorkspace.fields.clientGoal")}</Label><Textarea id="client-goal" rows={4} value={caseData.clientGoal ?? ""} onChange={(event) => update((current) => ({ ...current, clientGoal: event.target.value }))} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2"><Checkbox id="filing-jointly" checked={caseData.household.filingJointly} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, filingJointly: event.target.checked } }))} /><Label htmlFor="filing-jointly">{t("workspace:caseWorkspace.flags.filingJointly")}</Label></div>
              <div className="flex items-center gap-2"><Checkbox id="urgent-action" checked={caseData.household.urgentCollectionAction} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, urgentCollectionAction: event.target.checked } }))} /><Label htmlFor="urgent-action">{t("workspace:caseWorkspace.flags.urgentAction")}</Label></div>
              <div className="flex items-center gap-2"><Checkbox id="recent-transfer" checked={caseData.household.recentPropertyTransfer} onChange={(event) => update((current) => ({ ...current, household: { ...current.household, recentPropertyTransfer: event.target.checked } }))} /><Label htmlFor="recent-transfer">{t("workspace:caseWorkspace.flags.recentTransfer")}</Label></div>
            </div>
          </Card>
          </>
        ) : null}

        {activeStage === "income" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.incomeTitle")}
            description={t("workspace:stages.incomeDescription")}
            estimatedMinutes={4}
            percentComplete={caseData.incomes.length ? 100 : 0}
            missingItems={caseData.incomes.length ? [] : [t("workspace:caseWorkspace.missing.addIncome")]}
            example={t("workspace:caseWorkspace.incomeExample")}
            primaryActionLabel={t("workspace:entryModal.titles.income")}
            onPrimaryAction={() => setModalKind("income")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.income"))}
          />
          <ResponsiveDataView
            emptyMessage={t("workspace:caseWorkspace.empty.incomes")}
            rows={caseData.incomes}
            rowKey={(item) => item.id}
            renderActions={(item) => <AppButton size="xs" color="light" onClick={() => removeEntry("income", item.id)}>{t("common:actions.delete")}</AppButton>}
            columns={[
              { key: "source", header: t("workspace:caseWorkspace.columns.source"), hideLabelOnCard: true, render: (item) => <div><p className="font-semibold">{item.source}</p><p className="text-xs text-[var(--color-text-muted)]">{t(`workspace:entryModal.incomeCategories.${item.category}`)}</p></div> },
              { key: "frequency", header: t("workspace:caseWorkspace.columns.frequency"), render: (item) => t(`workspace:entryModal.frequencies.${item.frequency}`) },
              { key: "gross", header: t("workspace:caseWorkspace.columns.grossMonthly"), render: (item) => currency(monthlyAmount(item.grossAmount, item.frequency)) },
              { key: "net", header: t("workspace:caseWorkspace.columns.netMonthly"), render: (item) => currency(monthlyAmount(item.netAmount ?? item.grossAmount, item.frequency)) },
            ]}
          />
          </>
        ) : null}

        {activeStage === "expenses" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.expensesTitle")}
            description={t("workspace:stages.expensesDescription")}
            estimatedMinutes={5}
            percentComplete={caseData.expenses.length ? 100 : 0}
            missingItems={caseData.expenses.length ? [] : [t("workspace:caseWorkspace.missing.addExpense")]}
            example={t("workspace:caseWorkspace.expenseExample")}
            primaryActionLabel={t("workspace:entryModal.titles.expense")}
            onPrimaryAction={() => setModalKind("expense")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.expenses"))}
          />
          <ResponsiveDataView
            emptyMessage={t("workspace:caseWorkspace.empty.expenses")}
            rows={caseData.expenses}
            rowKey={(item) => item.id}
            renderActions={(item) => <AppButton size="xs" color="light" onClick={() => removeEntry("expense", item.id)}>{t("common:actions.delete")}</AppButton>}
            columns={[
              { key: "category", header: t("workspace:caseWorkspace.columns.category"), hideLabelOnCard: true, render: (item) => <p className="font-semibold">{t(`workspace:entryModal.expenseCategories.${item.category}`)}</p> },
              { key: "description", header: t("workspace:caseWorkspace.columns.description"), render: (item) => item.description },
              { key: "amount", header: t("workspace:caseWorkspace.columns.amount"), render: (item) => currency(item.monthlyAmount) },
              { key: "essential", header: t("workspace:caseWorkspace.columns.essential"), render: (item) => (item.essential ? t("common:labels.yes") : t("common:labels.no")) },
            ]}
          />
          </>
        ) : null}

        {activeStage === "debts" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.debtsTitle")}
            description={t("workspace:stages.debtsDescription")}
            estimatedMinutes={5}
            percentComplete={caseData.debts.length ? 100 : 0}
            missingItems={caseData.debts.length ? [] : [t("workspace:caseWorkspace.missing.addDebt")]}
            example={t("workspace:caseWorkspace.debtExample")}
            primaryActionLabel={t("workspace:entryModal.titles.debt")}
            onPrimaryAction={() => setModalKind("debt")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.debts"))}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {caseData.debts.map((item) => (
              <Card key={item.id} className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-none">
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold">{item.creditor}</p><p className="text-sm text-[var(--color-text-muted)]">{item.description}</p></div>
                  <Badge color={item.collectionLawsuit || item.delinquentAmount > 0 ? "failure" : "gray"}>{t(`workspace:entryModal.debtTypes.${item.debtType}`)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.labels.balance")}</p><p className="font-semibold">{currency(item.balance)}</p></div>
                  <div><p className="text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.labels.delinquent")}</p><p className="font-semibold">{currency(item.delinquentAmount)}</p></div>
                </div>
                <AppButton size="xs" color="light" className="mt-4" onClick={() => removeEntry("debt", item.id)}>{t("common:actions.delete")}</AppButton>
              </Card>
            ))}
            {!caseData.debts.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)] lg:col-span-2">{t("workspace:caseWorkspace.empty.debts")}</p> : null}
          </div>
          </>
        ) : null}

        {activeStage === "assets" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.assetsTitle")}
            description={t("workspace:stages.assetsDescription")}
            estimatedMinutes={4}
            percentComplete={caseData.assets.length ? 100 : 0}
            missingItems={caseData.assets.length ? [] : [t("workspace:caseWorkspace.missing.addAsset")]}
            example={t("workspace:caseWorkspace.assetExample")}
            primaryActionLabel={t("workspace:entryModal.titles.asset")}
            onPrimaryAction={() => setModalKind("asset")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.assets"))}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {caseData.assets.map((item) => (
              <Card key={item.id} className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-none">
                <p className="font-semibold">{item.description}</p><p className="text-sm text-[var(--color-text-muted)]">{t(`workspace:entryModal.assetCategories.${item.category}`)}</p>
                <div className="mt-3 flex justify-between text-sm"><span>{t("workspace:caseWorkspace.labels.value")} {currency(item.estimatedValue)}</span><span>{t("workspace:caseWorkspace.labels.lien")} {currency(item.loanBalance)}</span></div>
                <AppButton size="xs" color="light" className="mt-4" onClick={() => removeEntry("asset", item.id)}>{t("common:actions.delete")}</AppButton>
              </Card>
            ))}
            {!caseData.assets.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)] lg:col-span-2">{t("workspace:caseWorkspace.empty.assets")}</p> : null}
          </div>
          </>
        ) : null}

        {activeStage === "documents" ? (
          <>
          <StageOrientation
            title={t("workspace:stages.documentsTitle")}
            description={t("workspace:stages.documentsDescription")}
            estimatedMinutes={6}
            percentComplete={analysis?.evidence_score ?? 0}
            missingItems={missingEvidenceCount ? [t("workspace:caseWorkspace.missing.documentsWithoutSupport", { count: missingEvidenceCount })] : []}
            example={t("workspace:caseWorkspace.documentsExample")}
            primaryActionLabel={t("workspace:entryModal.titles.evidence")}
            onPrimaryAction={() => setModalKind("evidence")}
            onOpenChat={() => openChat(t("workspace:caseWorkspace.chatPrompts.documents"))}
          />
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <Card className="border border-[var(--color-border)] bg-white shadow-sm">
              <div className="space-y-3">
                {caseData.evidence.map((item) => (
                  // min-w-0 on the row and on the name column is what lets
                  // `truncate` engage: a flex item's automatic minimum size is
                  // its content, so an unbroken uploaded file name would
                  // otherwise widen the card instead of ellipsizing.
                  <div key={item.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]"><AppIcon name="evidence" /></span>
                      <div className="min-w-0"><p className="truncate font-semibold" title={item.name || undefined}>{item.name || t("workspace:entryModal.pendingFileName")}</p><p className="truncate text-sm text-[var(--color-text-muted)]">{t(`workspace:entryModal.evidenceTypes.${item.evidenceType}`)}</p></div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge color={item.status === "reviewed" ? "success" : item.status === "received" ? "info" : item.status === "requested" ? "warning" : "gray"}>{t(`workspace:entryModal.evidenceStatus.${item.status}`)}</Badge>
                      <AppButton size="xs" color="light" onClick={() => removeEntry("evidence", item.id)}>{t("common:actions.delete")}</AppButton>
                    </div>
                  </div>
                ))}
                {!caseData.evidence.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.empty.documents")}</p> : null}
              </div>
            </Card>
            <Card className="border border-[var(--color-border)] bg-white shadow-sm">
              <h2 className="text-lg font-semibold">{t("workspace:caseWorkspace.evidenceChecklistTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.evidenceChecklistDescription")}</p>
              <div className="mt-4 space-y-2">
                {requiredEvidence.map((requirement) => {
                  const present = requiredEvidencePresent(requirement);
                  return (
                    <div key={requirement} className="flex gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                      <AppIcon name={present ? "check" : "document"} className={present ? "text-fg-success" : "text-[var(--color-text-muted)]"} />
                      <span>{requirement}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
          </>
        ) : null}

        {activeStage === "review" ? (
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.review.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.review.description")}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                [t("workspace:tabs.household"), householdComplete],
                [t("workspace:tabs.income"), caseData.incomes.length > 0],
                [t("workspace:tabs.expenses"), caseData.expenses.length > 0],
                [t("workspace:tabs.debts"), caseData.debts.length > 0],
                [t("workspace:tabs.assets"), caseData.assets.length > 0],
                [t("workspace:tabs.documents"), caseData.evidence.length > 0],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                  <AppIcon name={done ? "check" : "alert"} size={16} className={done ? "text-fg-success" : "text-fg-warning"} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.review.whatAttorneySeesTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                {t("workspace:caseWorkspace.review.whatAttorneySeesDescription")}
              </p>
            </div>
            {!isAttorney && caseData.status === "draft" ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.review.submitHint")}</p> : null}
          </Card>
        ) : null}

        {activeStage === "submitted" ? (
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            {isSubmitted ? (
              <>
                <div className="flex items-center gap-3"><AppIcon name="check" className="text-fg-success" /><h2 className="text-xl font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.submitted.sentTitle")}</h2></div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {caseData.submittedAt ? t("workspace:caseWorkspace.submitted.sentAt", { date: formatDate(caseData.submittedAt) }) : t("workspace:caseWorkspace.submitted.attorneyHasAccess")}
                  {" "}{t("workspace:caseWorkspace.submitted.followUp")}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.submitted.notSentTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.submitted.notSentDescription")}</p>
              </>
            )}
          </Card>
        ) : null}

        {activeStage === "tracking" ? (
          <Card className="border border-[var(--color-border)] bg-white shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">{t("workspace:caseWorkspace.trackingTitle")}</h2>
            <CaseTimeline events={caseData.timeline} />
          </Card>
        ) : null}

        {activeStage === "attorney-review" && isAttorney ? (
          <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <Label htmlFor="attorney-status">{t("workspace:caseWorkspace.attorneyReview.caseStatus")}</Label>
                <Select
                  id="attorney-status"
                  value={caseData.status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as CaseStatus;
                    workspace.updateStatus(
                      caseData.id,
                      nextStatus,
                      t("workspace:actionBar.timeline.statusChanged", { status: t(`workspace:status.${nextStatus}`) }),
                    );
                  }}
                >
                  <option value="submitted">{t("workspace:status.submitted")}</option><option value="attorney_review">{t("workspace:status.attorney_review")}</option><option value="consultation_scheduled">{t("workspace:status.consultation_scheduled")}</option><option value="decision_pending">{t("workspace:status.decision_pending")}</option><option value="filing_preparation">{t("workspace:status.filing_preparation")}</option><option value="closed">{t("workspace:status.closed")}</option>
                </Select>
                <div className="mt-5">
                  <Label htmlFor="attorney-notes">{t("workspace:caseWorkspace.attorneyReview.professionalNotes")}</Label>
                  <Textarea id="attorney-notes" rows={10} value={caseData.attorneyNotes ?? ""} onChange={(event) => update((current) => ({ ...current, attorneyNotes: event.target.value }))} placeholder={t("workspace:caseWorkspace.attorneyReview.notesPlaceholder")} />
                </div>
              </Card>
              <Card className="border border-[var(--color-border)] bg-white shadow-sm">
                <h2 className="text-lg font-semibold">{t("workspace:caseWorkspace.attorneyReview.checklistTitle")}</h2>
                <div className="mt-4 space-y-3">{analysis?.discussion_points.map((item) => <div key={item} className="flex gap-3 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm"><AppIcon name="check" className="shrink-0" /><span>{item}</span></div>)}</div>
              </Card>
            </div>
        ) : null}
      </div>

      <BankruptcyEntryModal open={Boolean(modalKind)} kind={modalKind} onClose={() => setModalKind(null)} onSave={addEntry} />
    </div>
  );
}
