export type UserRole = "applicant" | "case_manager" | "admin";
export type PreferredLanguage = "es" | "en";
export type CaseStatus = "draft" | "in_progress" | "ready_for_review" | "under_review" | "closed";
export type DocumentCategory = "identity" | "income" | "bank" | "tax" | "asset" | "debt" | "other";
export type DocumentStatus = "requested" | "uploaded" | "verified" | "needs_attention";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type AlertSeverity = "info" | "warning" | "critical";

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

export interface CaseDocument {
  id: string;
  case_id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  file_url: string | null;
  notes: string;
  uploaded_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseTask {
  id: string;
  case_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseNote {
  id: string;
  case_id: string;
  content: string;
  is_internal: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CaseAlert {
  id: string;
  case_id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseWorkspace {
  documents: CaseDocument[];
  tasks: CaseTask[];
  notes: CaseNote[];
  alerts: CaseAlert[];
}

export interface DashboardSummary {
  total_cases: number;
  in_progress_cases: number;
  ready_for_review_cases: number;
  unresolved_alerts: number;
  overdue_tasks: number;
  completion_average: number;
}

export interface AssistantReply {
  message: string;
  language: PreferredLanguage;
  disclaimer: string;
  missing_sections: string[];
}
