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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
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
import {
  CASE_SECTION,
  FOCUS_PARAM_TO_SECTION,
  isCaseSectionSlug,
  ROUTES,
} from "../config/routes";
import type { CaseStatus, EntryKind } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import { currency, monthlyAmount } from "../workspace/caseMetrics";
import { formatDate } from "../i18n/format";
import { STAGE_LABEL_KEYS } from "./caseWorkspace/stages";
import { useCaseAnalysis } from "./caseWorkspace/useCaseAnalysis";
import { useCaseEntries } from "./caseWorkspace/useCaseEntries";
import { useCaseStageNavigation } from "./caseWorkspace/useCaseStageNavigation";

/**
 * The stage vocabulary moved to `./caseWorkspace/stages`, and the navigation,
 * analysis and mutation logic to the hooks beside it. Re-exported here because
 * `BASE_STAGE_ORDER` is imported by this page's tests and `CaseStage` reads
 * naturally as this page's type — moving the definitions out should not force
 * every consumer to learn where they went.
 */
export type { CaseStage } from "./caseWorkspace/stages";
export { BASE_STAGE_ORDER, SECTION_TO_STAGE, STAGE_LABEL_KEYS, STAGE_TO_SECTION } from "./caseWorkspace/stages";

function statusColor(status: CaseStatus): "gray" | "warning" | "success" | "info" {
  if (status === "submitted" || status === "attorney_review") return "warning";
  if (status === "consultation_scheduled" || status === "filing_preparation") return "info";
  if (status === "closed") return "success";
  return "gray";
}

export function CaseWorkspacePage() {
  const { t } = useTranslation(["workspace", "common"]);
  const { caseId, section } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const { openAssistant } = useChatPanel();
  const caseData = workspace.cases.find((item) => item.id === caseId);
  const [modalKind, setModalKind] = useState<EntryKind | null>(null);
  const isAttorney = user?.role === "attorney";

  const {
    stageOrder: STAGE_ORDER,
    activeStage,
    navigateToStage,
  } = useCaseStageNavigation({ caseId, section, isAttorney });

  const {
    analysis,
    error: analysisError,
    completion,
    requiredEvidence,
    missingEvidenceCount,
    requiredEvidencePresent,
  } = useCaseAnalysis(caseData);

  // `caseId ?? ""` because the hook must be called unconditionally, while the
  // guards below can still redirect away when there is no case. The empty id is
  // never used: every consumer of these actions renders after those guards.
  const { update, addEntry, removeEntry, toggleUrgentCollectionAction: markUrgent } = useCaseEntries(caseId ?? "");

  // Backwards compatibility for `?focus=<section>` links — the vocabulary the
  // backend's `focus_section` still speaks, plus any URL a user bookmarked
  // before sections became path segments. It resolves to the canonical path
  // and replaces the history entry, so back doesn't bounce through the old
  // form. This is the only place the legacy parameter is understood.
  const legacyFocus = searchParams.get("focus");
  const legacySection = legacyFocus ? FOCUS_PARAM_TO_SECTION[legacyFocus] : undefined;

  if (!caseData || !user) return <Navigate to={ROUTES.home} replace />;
  if (user.role === "client" && caseData.ownerUserId !== user.id) return <Navigate to={ROUTES.home} replace />;
  if (legacySection) return <Navigate to={ROUTES.caseSection(caseData.id, legacySection)} replace />;
  // `/case/:id` with no section is the overview; give it its canonical URL so
  // the sidebar's "My case" entry and a section entry can't both look active.
  if (!isCaseSectionSlug(section)) {
    return <Navigate to={ROUTES.caseSection(caseData.id, CASE_SECTION.overview)} replace />;
  }

  const isSubmitted = caseData.status !== "draft" && caseData.status !== "collecting_information";
  // Derived from STAGE_ORDER (via the stage-key → i18n-key map STAGE_LABEL_KEYS)
  // rather than a separately hand-maintained list, so it always has exactly
  // as many titles as STAGE_ORDER has stages — including "attorney-review"
  // when present — and can never drift out of sync with it.
  const stageStepperTitles = STAGE_ORDER.map((stage) => t(STAGE_LABEL_KEYS[stage]));

  const householdComplete = Boolean(caseData.household.maritalStatus && caseData.household.housingStatus);

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
          <p className="text-label mb-3 text-indigo-700">{t("workspace:actions.caseActions")}</p>
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.household"))}
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.income"))}
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.expenses"))}
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.debts"))}
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.assets"))}
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
            onOpenChat={() => openAssistant(t("workspace:caseWorkspace.chatPrompts.documents"))}
          />
          {/* `min-w-0` on the cards, not just on the rows inside them. A grid
              item's automatic minimum size is its content, exactly like a flex
              item's, so these two cards were laid out at their min-content
              width — 320px — inside a 288px track at a 320px viewport, and
              overflowed the page by the `main` element's own 16px padding.
              `frontend/e2e/responsive-overflow.spec.ts` is the regression gate. */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <Card className="min-w-0 border border-[var(--color-border)] bg-white shadow-sm">
              <div className="space-y-3">
                {caseData.evidence.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]"><AppIcon name="evidence" /></span>
                      <div><p className="font-semibold">{item.name || t("workspace:entryModal.pendingFileName")}</p><p className="text-sm text-[var(--color-text-muted)]">{t(`workspace:entryModal.evidenceTypes.${item.evidenceType}`)}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={item.status === "reviewed" ? "success" : item.status === "received" ? "info" : item.status === "requested" ? "warning" : "gray"}>{t(`workspace:entryModal.evidenceStatus.${item.status}`)}</Badge>
                      <AppButton size="xs" color="light" onClick={() => removeEntry("evidence", item.id)}>{t("common:actions.delete")}</AppButton>
                    </div>
                  </div>
                ))}
                {!caseData.evidence.length ? <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.empty.documents")}</p> : null}
              </div>
            </Card>
            <Card className="min-w-0 border border-[var(--color-border)] bg-white shadow-sm">
              <h2 className="text-lg font-semibold">{t("workspace:caseWorkspace.evidenceChecklistTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{t("workspace:caseWorkspace.evidenceChecklistDescription")}</p>
              <div className="mt-4 space-y-2">
                {requiredEvidence.map((requirement) => {
                  const present = requiredEvidencePresent(requirement);
                  return (
                    <div key={requirement} className="flex gap-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                      <AppIcon name={present ? "check" : "document"} className={present ? "text-emerald-700" : "text-[var(--color-text-muted)]"} />
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
                  <AppIcon name={done ? "check" : "alert"} size={16} className={done ? "text-emerald-700" : "text-[var(--color-warning)]"} />
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
                <div className="flex items-center gap-3"><AppIcon name="check" className="text-emerald-700" /><h2 className="text-xl font-semibold text-[var(--color-text)]">{t("workspace:caseWorkspace.submitted.sentTitle")}</h2></div>
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
