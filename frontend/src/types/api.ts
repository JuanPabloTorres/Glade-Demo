import type {
  CASE_TYPE_VALUES,
  CONFLICT_STATUS_VALUES,
  DOCUMENT_STATUS_VALUES,
  DOCUMENT_TYPE_VALUES,
  MATTER_STATUS_VALUES,
} from "../config/domainOptions";

export type CaseType = (typeof CASE_TYPE_VALUES)[number];
export type MatterStatus = (typeof MATTER_STATUS_VALUES)[number];
export type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUS_VALUES)[number];
export type ConflictStatus = (typeof CONFLICT_STATUS_VALUES)[number];

export interface MatterCreateDto {
  display_name: string;
  case_type: CaseType;
  email?: string;
  phone?: string;
  assigned_to?: string;
}

export interface MatterIntakeUpdateDto {
  display_name: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  summary?: string;
}

export interface MatterSummaryDto {
  id: string;
  display_name: string;
  case_type: CaseType;
  status: MatterStatus;
  email: string | null;
  phone: string | null;
  assigned_to: string | null;
  created_at: string;
  open_conflicts: number;
  readiness_score: number;
}

export interface MatterDetailDto
  extends Omit<MatterSummaryDto, "open_conflicts" | "readiness_score"> {
  address: string | null;
  date_of_birth: string | null;
  summary: string | null;
  updated_at: string;
}

export interface DocumentCreateDto {
  original_name: string;
  document_type: DocumentType;
  content: string;
}

export interface ExtractedFactDto {
  id: string;
  field_name: string;
  value: string;
  source_type: string;
  source_label: string;
  is_current: boolean;
}

export interface DocumentDto {
  id: string;
  original_name: string;
  document_type: DocumentType;
  status: DocumentStatus;
  created_at: string;
  facts: ExtractedFactDto[];
}

export interface ConflictDto {
  id: string;
  field_name: string;
  canonical_value: string;
  conflicting_value: string;
  canonical_source: string;
  conflicting_source: string;
  status: ConflictStatus;
  resolved_value: string | null;
  created_at: string;
}

export interface ReadinessItemDto {
  key: string;
  label: string;
  complete: boolean;
  source: string;
}

export interface ReadinessDto {
  score: number;
  complete_items: number;
  total_items: number;
  open_conflicts: number;
  items: ReadinessItemDto[];
}

export interface ActivityDto {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
}
