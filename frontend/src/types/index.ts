export type UserRole = "applicant" | "case_manager" | "admin";
export type PreferredLanguage = "es" | "en";
export type CaseStatus = "draft" | "in_progress" | "ready_for_review" | "under_review";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface IntakeSection {
  id: string;
  section_key: string;
  data: Record<string, unknown>;
  completed: boolean;
  updated_at: string;
}

export interface BankruptcyCase {
  id: string;
  applicant_id: string;
  title: string;
  status: CaseStatus;
  preferred_language: PreferredLanguage;
  current_step: number;
  progress: number;
  readiness_score: number;
  summary: string;
  created_at: string;
  updated_at: string;
  sections: IntakeSection[];
}

export interface AssistantReply {
  message: string;
  language: PreferredLanguage;
  disclaimer: string;
  missing_sections: string[];
}
