import { describe, expect, it } from "vitest";
import { localCompletion, monthlyAmount } from "./caseMetrics";
import type { BankruptcyCase } from "../types/bankruptcy";

it("normalizes biweekly income to a monthly amount", () => {
  expect(monthlyAmount(1200, "biweekly")).toBe(2600);
});

describe("localCompletion", () => {
  it("counts completed financial sections", () => {
    const caseData = {
      clientName: "Demo",
      clientEmail: "demo@example.test",
      clientGoal: "Prepare consultation",
      household: { maritalStatus: "single", housingStatus: "rent" },
      incomes: [{}],
      expenses: [{}],
      debts: [{}],
      assets: [{}],
      evidence: [{}],
    } as unknown as BankruptcyCase;
    expect(localCompletion(caseData)).toBe(100);
  });
});
