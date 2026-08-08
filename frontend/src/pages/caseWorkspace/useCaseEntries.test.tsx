import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankruptcyCase } from "../../types/bankruptcy";
import { useCaseEntries } from "./useCaseEntries";

const mockUpdateCase = vi.fn();
vi.mock("../../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => ({ updateCase: mockUpdateCase }),
}));

function baseCase(): BankruptcyCase {
  return {
    id: "case-1",
    ownerUserId: "client-1",
    clientName: "Elena Rivera",
    clientEmail: "client@freshstart.demo",
    preferredLanguage: "es",
    status: "draft",
    household: {
      householdSize: 2,
      dependents: 1,
      filingJointly: false,
      urgentCollectionAction: false,
      recentPropertyTransfer: false,
    },
    incomes: [{ id: "income-1", category: "wages", source: "A", grossAmount: 100, frequency: "monthly", evidenceIds: [] }],
    expenses: [{ id: "expense-1", category: "housing", description: "Alquiler", monthlyAmount: 50, essential: true, evidenceIds: [] }],
    debts: [{ id: "debt-1", creditor: "C", debtType: "unsecured", description: "D", balance: 10, monthlyPayment: 1, delinquentAmount: 0, collectionLawsuit: false, evidenceIds: [] }],
    assets: [{ id: "asset-1", category: "vehicle", description: "Car", estimatedValue: 10, loanBalance: 0, jointlyOwned: false, evidenceIds: [] }],
    evidence: [{ id: "evidence-1", evidenceType: "pay-stubs", name: "a.pdf", status: "received", relatedEntryIds: [] }],
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    messages: [],
    timeline: [],
  };
}

/** Run the reducer the hook handed to `updateCase` against a known case. */
function applyLastUpdate(): BankruptcyCase {
  const [caseId, updater] = mockUpdateCase.mock.calls.at(-1) as [
    string,
    (value: BankruptcyCase) => BankruptcyCase,
  ];
  expect(caseId).toBe("case-1");
  return updater(baseCase());
}

describe("useCaseEntries", () => {
  beforeEach(() => mockUpdateCase.mockClear());

  const entries = () => renderHook(() => useCaseEntries("case-1")).result.current;

  describe("adding", () => {
    // The kind-to-list mapping used to exist twice in the page — an if-chain in
    // addEntry and five ternaries in removeEntry — so a new kind had two places
    // to update and only one would fail loudly. These pin every branch.
    it.each([
      ["income", "incomes"],
      ["expense", "expenses"],
      ["debt", "debts"],
      ["asset", "assets"],
      ["evidence", "evidence"],
    ] as const)("puts a new %s in the right list", (kind, list) => {
      const before = baseCase();
      entries().addEntry({ kind, value: { ...(before[list][0] as never), id: "new-1" } } as never);

      const next = applyLastUpdate();
      expect(next[list].map((item) => item.id)).toEqual([before[list][0].id, "new-1"]);
    });

    it("leaves the other lists untouched", () => {
      const before = baseCase();
      entries().addEntry({ kind: "debt", value: { ...before.debts[0], id: "debt-2" } } as never);

      const next = applyLastUpdate();
      expect(next.incomes).toHaveLength(1);
      expect(next.expenses).toHaveLength(1);
      expect(next.assets).toHaveLength(1);
      expect(next.evidence).toHaveLength(1);
    });
  });

  describe("removing", () => {
    it.each([
      ["income", "incomes", "income-1"],
      ["expense", "expenses", "expense-1"],
      ["debt", "debts", "debt-1"],
      ["asset", "assets", "asset-1"],
      ["evidence", "evidence", "evidence-1"],
    ] as const)("removes a %s by id", (kind, list, id) => {
      entries().removeEntry(kind, id);

      expect(applyLastUpdate()[list]).toHaveLength(0);
    });

    it("removes nothing when the id belongs to another kind's entry", () => {
      entries().removeEntry("debt", "income-1");

      const next = applyLastUpdate();
      expect(next.debts).toHaveLength(1);
      expect(next.incomes).toHaveLength(1);
    });
  });

  it("toggles the urgent-collection flag without disturbing the rest of the household", () => {
    entries().toggleUrgentCollectionAction();

    const next = applyLastUpdate();
    expect(next.household.urgentCollectionAction).toBe(true);
    expect(next.household.householdSize).toBe(2);
    expect(next.household.dependents).toBe(1);
  });
});
