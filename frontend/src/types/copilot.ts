export type ChatRole = "assistant" | "user";
export type CaseType = "immigration" | "bankruptcy" | "general" | "unknown";
export type EvidenceStatus = "confirmed" | "missing" | "conflict";
export type IssueKind = "missing" | "conflict";
export type IssueStatus = "open" | "resolved";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface CaseProfile {
  goal: string | null;
  case_type: CaseType | null;
  client_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  deadline: string | null;
  notes: string | null;
}

export interface EvidenceDocument {
  id: string;
  label: string;
  text: string;
  facts: Record<string, string>;
  created_at: string;
}

export interface ConversationState {
  session_id: string;
  messages: ChatMessage[];
  profile: CaseProfile;
  documents: EvidenceDocument[];
  resolutions: Record<string, string>;
}

export interface EvidenceValue {
  value: string;
  source: string;
  confidence: number;
}

export interface EvidenceRow {
  field: string;
  label: string;
  status: EvidenceStatus;
  values: EvidenceValue[];
}

export interface ReviewIssue {
  id: string;
  kind: IssueKind;
  field: string;
  label: string;
  message: string;
  values: string[];
  status: IssueStatus;
  selected_value: string | null;
}

export interface CasePacket {
  profile: CaseProfile;
  evidence: EvidenceRow[];
  issues: ReviewIssue[];
  readiness: number;
  next_action: string;
  summary: string;
}

export interface CopilotResponse {
  state: ConversationState;
  packet: CasePacket;
  assistant_message: ChatMessage;
  quick_replies: string[];
}
