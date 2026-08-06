import type { UserRole } from "./api";

export type CaseStatus =
  | "draft"
  | "collecting_information"
  | "submitted"
  | "attorney_review"
  | "consultation_scheduled"
  | "decision_pending"
  | "filing_preparation"
  | "closed";

export type Frequency =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "annual";
export type DebtType = "secured" | "priority" | "unsecured";
export type EvidenceStatus = "missing" | "requested" | "received" | "reviewed";
export type EntryKind = "income" | "expense" | "debt" | "asset" | "evidence";

export interface Household {
  maritalStatus?: string;
  householdSize: number;
  dependents: number;
  filingJointly: boolean;
  housingStatus?: string;
  municipality?: string;
  urgentCollectionAction: boolean;
  recentPropertyTransfer: boolean;
}

export interface IncomeEntry {
  id: string;
  category: string;
  source: string;
  grossAmount: number;
  netAmount?: number;
  frequency: Frequency;
  evidenceIds: string[];
}

export interface ExpenseEntry {
  id: string;
  category: string;
  description: string;
  monthlyAmount: number;
  essential: boolean;
  evidenceIds: string[];
}

export interface DebtEntry {
  id: string;
  creditor: string;
  debtType: DebtType;
  description: string;
  balance: number;
  monthlyPayment: number;
  delinquentAmount: number;
  collateral?: string;
  collectionLawsuit: boolean;
  evidenceIds: string[];
}

export interface AssetEntry {
  id: string;
  category: string;
  description: string;
  estimatedValue: number;
  loanBalance: number;
  jointlyOwned: boolean;
  evidenceIds: string[];
}

export interface EvidenceItem {
  id: string;
  evidenceType: string;
  name: string;
  status: EvidenceStatus;
  note?: string;
  relatedEntryIds: string[];
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  stage: string;
  title: string;
  description: string;
  status: "complete" | "current" | "upcoming";
  createdAt: string;
}

export interface BankruptcyCase {
  id: string;
  ownerUserId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  preferredLanguage: string;
  status: CaseStatus;
  household: Household;
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  assets: AssetEntry[];
  evidence: EvidenceItem[];
  clientGoal?: string;
  attorneyNotes?: string;
  assignedAttorneyName?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  messages: ChatMessage[];
  timeline: TimelineEvent[];
}

export interface CaseAnalysis {
  monthly_gross_income: number;
  monthly_net_income: number;
  monthly_expenses: number;
  monthly_cash_flow: number;
  total_debt: number;
  secured_debt: number;
  priority_debt: number;
  unsecured_debt: number;
  total_asset_value: number;
  net_asset_value: number;
  completion_score: number;
  evidence_score: number;
  missing_items: string[];
  warnings: string[];
  discussion_points: string[];
  chapter_7_questions: string[];
  chapter_13_questions: string[];
  required_evidence: string[];
  next_steps: string[];
}

export type AssistantActionType =
  | "navigate"
  | "open_modal"
  | "upload_document"
  | "update_case"
  | "request_document"
  | "create_note"
  // See backend/app/schemas/assistant.py for why this exists beyond the
  // master instruction's six-value example list.
  | "ask";

export interface AssistantAction {
  id: string;
  label: string;
  icon: string;
  action_type: AssistantActionType;
  target?: string | null;
}

export interface AssistantResponse {
  message: string;
  intent: string;
  suggested_actions: AssistantAction[];
  focus_section: string | null;
  requested_fields: string[];
  requested_documents: string[];
  warnings: string[];
  summary_updates: string[];
  requires_attorney_review: boolean;
  confidence: number | null;
  disclaimer: string;
}

export type EntrySubmission =
  | { kind: "income"; value: IncomeEntry }
  | { kind: "expense"; value: ExpenseEntry }
  | { kind: "debt"; value: DebtEntry }
  | { kind: "asset"; value: AssetEntry }
  | { kind: "evidence"; value: EvidenceItem };

export interface ApiBankruptcyCase {
  id: string;
  owner_user_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  preferred_language: string;
  status: CaseStatus;
  household: {
    marital_status?: string;
    household_size: number;
    dependents: number;
    filing_jointly: boolean;
    housing_status?: string;
    municipality?: string;
    urgent_collection_action: boolean;
    recent_property_transfer: boolean;
  };
  incomes: Array<{
    id: string;
    category: string;
    source: string;
    gross_amount: number;
    net_amount?: number;
    frequency: Frequency;
    evidence_ids: string[];
  }>;
  expenses: Array<{
    id: string;
    category: string;
    description: string;
    monthly_amount: number;
    essential: boolean;
    evidence_ids: string[];
  }>;
  debts: Array<{
    id: string;
    creditor: string;
    debt_type: DebtType;
    description: string;
    balance: number;
    monthly_payment: number;
    delinquent_amount: number;
    collateral?: string;
    collection_lawsuit: boolean;
    evidence_ids: string[];
  }>;
  assets: Array<{
    id: string;
    category: string;
    description: string;
    estimated_value: number;
    loan_balance: number;
    jointly_owned: boolean;
    evidence_ids: string[];
  }>;
  evidence: Array<{
    id: string;
    evidence_type: string;
    name: string;
    status: EvidenceStatus;
    note?: string;
    related_entry_ids: string[];
  }>;
  client_goal?: string;
  attorney_notes?: string;
}

export interface WorkspaceState {
  cases: BankruptcyCase[];
}

export interface GuidanceRequest {
  case: ApiBankruptcyCase;
  message: string;
  role: UserRole;
  locale: string;
}
