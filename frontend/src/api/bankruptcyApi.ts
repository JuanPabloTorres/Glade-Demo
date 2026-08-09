import { apiContracts } from "./apiContracts.generated";
import { http } from "./http";
import { LANGUAGE_STORAGE_KEY, toLocale } from "../i18n/languages";
import type {
  ApiBankruptcyCase,
  AssistantResponse,
  AssistantScope,
  BankruptcyCase,
  CaseAnalysis,
} from "../types/bankruptcy";
import type { UserRole } from "../types/api";

function pathFor(key: "bankruptcy.analyze" | "bankruptcy.guide"): string {
  return apiContracts[key].path;
}

export function toApiCase(caseData: BankruptcyCase): ApiBankruptcyCase {
  return {
    id: caseData.id,
    owner_user_id: caseData.ownerUserId,
    client_name: caseData.clientName,
    client_email: caseData.clientEmail,
    client_phone: caseData.clientPhone,
    preferred_language: caseData.preferredLanguage,
    status: caseData.status,
    household: {
      marital_status: caseData.household.maritalStatus,
      household_size: caseData.household.householdSize,
      dependents: caseData.household.dependents,
      filing_jointly: caseData.household.filingJointly,
      housing_status: caseData.household.housingStatus,
      municipality: caseData.household.municipality,
      urgent_collection_action: caseData.household.urgentCollectionAction,
      recent_property_transfer: caseData.household.recentPropertyTransfer,
    },
    incomes: caseData.incomes.map((item) => ({
      id: item.id,
      category: item.category,
      source: item.source,
      gross_amount: item.grossAmount,
      net_amount: item.netAmount,
      frequency: item.frequency,
      evidence_ids: item.evidenceIds,
    })),
    expenses: caseData.expenses.map((item) => ({
      id: item.id,
      category: item.category,
      description: item.description,
      monthly_amount: item.monthlyAmount,
      essential: item.essential,
      evidence_ids: item.evidenceIds,
    })),
    debts: caseData.debts.map((item) => ({
      id: item.id,
      creditor: item.creditor,
      debt_type: item.debtType,
      description: item.description,
      balance: item.balance,
      monthly_payment: item.monthlyPayment,
      delinquent_amount: item.delinquentAmount,
      collateral: item.collateral,
      collection_lawsuit: item.collectionLawsuit,
      evidence_ids: item.evidenceIds,
    })),
    assets: caseData.assets.map((item) => ({
      id: item.id,
      category: item.category,
      description: item.description,
      estimated_value: item.estimatedValue,
      loan_balance: item.loanBalance,
      jointly_owned: item.jointlyOwned,
      evidence_ids: item.evidenceIds,
    })),
    evidence: caseData.evidence.map((item) => ({
      id: item.id,
      evidence_type: item.evidenceType,
      name: item.name,
      status: item.status,
      note: item.note,
      related_entry_ids: item.relatedEntryIds,
    })),
    client_goal: caseData.clientGoal,
    attorney_notes: caseData.attorneyNotes,
  };
}

/**
 * One in-flight request per exact case snapshot.
 *
 * React StrictMode deliberately runs effect setup/cleanup twice in development.
 * Both the client dashboard and the case workspace analyze the current snapshot
 * from an effect, so the Vite/Playwright path could submit the same brand-new
 * case twice before either request committed it. The backend correctly treats
 * the first analyze as case creation, which made the duplicate race on the same
 * primary key.
 *
 * Coalescing only byte-for-byte-equivalent snapshots keeps that development
 * behavior honest without hiding real edits: if any case field changes, the
 * serialized request key changes and a new analysis is sent. The entry is
 * removed after success or failure, so this is not a response cache.
 */
const analysisInFlight = new Map<string, Promise<CaseAnalysis>>();

export const bankruptcyApi = {
  analyze(caseData: BankruptcyCase): Promise<CaseAnalysis> {
    const apiCase = toApiCase(caseData);
    const requestKey = JSON.stringify(apiCase);
    const existing = analysisInFlight.get(requestKey);
    if (existing) return existing;

    const request = http
      .post<CaseAnalysis>(pathFor("bankruptcy.analyze"), { case: apiCase })
      .then((response) => response.data)
      .finally(() => {
        analysisInFlight.delete(requestKey);
      });
    analysisInFlight.set(requestKey, request);
    return request;
  },

  async guide(
    caseData: BankruptcyCase,
    message: string,
    role: UserRole,
    // Defaults to "case" so a caller that has no opinion never widens the
    // scope by accident — the same default the backend applies.
    assistantScope: AssistantScope = "case",
  ): Promise<AssistantResponse> {
    const selected = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const language = selected === "en" ? "en" : "es";
    const response = await http.post<AssistantResponse>(pathFor("bankruptcy.guide"), {
      case: toApiCase(caseData),
      message,
      role,
      locale: toLocale(language),
      assistant_scope: assistantScope,
    });
    return response.data;
  },
};
