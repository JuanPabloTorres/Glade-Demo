export const INCOME_CATEGORIES = [
  "wages",
  "self-employment",
  "social-security",
  "pension",
  "support",
  "rental",
  "other",
] as const;

export const EXPENSE_CATEGORIES = [
  "housing",
  "utilities",
  "food",
  "clothing",
  "medical",
  "transportation",
  "insurance",
  "childcare",
  "support",
  "personal",
  "other",
] as const;

export const DEBT_TYPES = ["secured", "priority", "unsecured"] as const;

export const ASSET_CATEGORIES = [
  "real-estate",
  "vehicle",
  "bank-account",
  "retirement",
  "personal-property",
  "insurance",
  "business",
  "claim",
  "other",
] as const;

export const EVIDENCE_TYPES = [
  "government-id",
  "pay-stubs",
  "bank-statement",
  "tax-return-or-transcript",
  "creditor-statement",
  "lease-agreement",
  "mortgage-statement",
  "vehicle-loan-statement",
  "collection-or-lawsuit-notice",
  "property-or-valuation-document",
  "credit-counseling-certificate",
  "other-document",
] as const;
