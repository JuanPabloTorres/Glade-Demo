import { apiContracts } from "./apiContracts.generated";
import { http } from "./http";
import type {
  ApiBankruptcyCase,
  AssistantResponse,
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

export const bankruptcyApi = {
  async analyze(caseData: BankruptcyCase): Promise<CaseAnalysis> {
    const response = await http.post<CaseAnalysis>(pathFor("bankruptcy.analyze"), {
      case: toApiCase(caseData),
    });
    return response.data;
  },

  async guide(
    caseData: BankruptcyCase,
    message: string,
    role: UserRole,
  ): Promise<AssistantResponse> {
    const response = await http.post<AssistantResponse>(pathFor("bankruptcy.guide"), {
      case: toApiCase(caseData),
      message,
      role,
      locale: caseData.preferredLanguage,
    });
    return response.data;
  },
};
