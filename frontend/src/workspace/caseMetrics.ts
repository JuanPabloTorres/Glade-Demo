import type { BankruptcyCase, Frequency } from "../types/bankruptcy";

const MULTIPLIERS: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

export function monthlyAmount(amount: number, frequency: Frequency): number {
  return Math.round(amount * MULTIPLIERS[frequency] * 100) / 100;
}

export function localCompletion(caseData: BankruptcyCase): number {
  const sections = [
    Boolean(caseData.clientName && caseData.clientEmail && caseData.clientGoal),
    Boolean(caseData.household.maritalStatus && caseData.household.housingStatus),
    caseData.incomes.length > 0,
    caseData.expenses.length > 0,
    caseData.debts.length > 0,
    caseData.assets.length > 0,
    caseData.evidence.length > 0,
  ];
  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
