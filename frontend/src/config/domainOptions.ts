export const CASE_TYPE_VALUES = ["immigration", "bankruptcy", "general"] as const;
export const MATTER_STATUS_VALUES = ["intake", "active", "ready_for_review"] as const;
export const DOCUMENT_TYPE_VALUES = [
  "identity",
  "proof_of_address",
  "financial",
  "supporting",
] as const;
export const DOCUMENT_STATUS_VALUES = ["processed", "needs_review"] as const;
export const CONFLICT_STATUS_VALUES = ["open", "resolved"] as const;

export const DEFAULT_CASE_TYPE = CASE_TYPE_VALUES[0];
export const DEFAULT_DOCUMENT_TYPE = DOCUMENT_TYPE_VALUES[0];

export const CASE_TYPE_OPTIONS = [
  { value: "immigration", label: "Immigration" },
  { value: "bankruptcy", label: "Bankruptcy" },
  { value: "general", label: "General" },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "identity", label: "Identity" },
  { value: "proof_of_address", label: "Proof of address" },
  { value: "financial", label: "Financial" },
  { value: "supporting", label: "Supporting" },
] as const;
