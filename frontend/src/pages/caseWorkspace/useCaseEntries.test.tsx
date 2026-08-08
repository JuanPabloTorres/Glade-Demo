import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankruptcyCase, EntrySubmission } from "../../types/bankruptcy";
import { useCaseEntries } from "./useCaseEntries";

/** The five case fields `addEntry`/`removeEntry` write into. */
type EntryListKey = "incomes" | "expenses" | "debts" | "assets" | "evidence";

/** Ids of one entry list, without needing the list's element type at the call site. */
function ids(caseData: BankruptcyCase, list: EntryListKey): string[] {
  return caseData[list].map((item) => item.id);
}

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
    //
    // Each submission is written out with its real type rather than derived
    // from the case by index. The derived form needed an `as never` cast, which
    // silences exactly the mismatch these tests exist to catch — and it did not
    // typecheck under `tsc -b` at all, only under vitest, which does not
    // typecheck. That is how a green test run shipped a broken build.
    const SUBMISSIONS: Array<{ submission: EntrySubmission; list: EntryListKey }> = [
      {
        list: "incomes",
        submission: {
          kind: "income",
          value: { id: "new-1", category: "wages", source: "B", grossAmount: 200, frequency: "monthly", evidenceIds: [] },
        },
      },
      {
        list: "expenses",
        submission: {
          kind: "expense",
          value: { id: "new-1", category: "food", description: "Alimentos", monthlyAmount: 60, essential: true, evidenceIds: [] },
        },
      },
      {
        list: "debts",
        submission: {
          kind: "debt",
          value: { id: "new-1", creditor: "E", debtType: "secured", description: "F", balance: 20, monthlyPayment: 2, delinquentAmount: 0, collectionLawsuit: false, evidenceIds: [] },
        },
      },
      {
        list: "assets",
        submission: {
          kind: "asset",
          value: { id: "new-1", category: "bank", description: "Cuenta", estimatedValue: 5, loanBalance: 0, jointlyOwned: false, evidenceIds: [] },
        },
      },
      {
        list: "evidence",
        submission: {
          kind: "evidence",
          value: { id: "new-1", evidenceType: "bank-statement", name: "b.pdf", status: "received", relatedEntryIds: [] },
        },
      },
    ];

    it.each(SUBMISSIONS)("puts a new $submission.kind in the right list", ({ submission, list }) => {
      const existing = ids(baseCase(), list);
      entries().addEntry(submission);

      expect(ids(applyLastUpdate(), list)).toEqual([...existing, "new-1"]);
    });

    it("leaves the other lists untouched", () => {
      const debtSubmission = SUBMISSIONS.find((entry) => entry.list === "debts");
      expect(debtSubmission).toBeDefined();
      entries().addEntry(debtSubmission!.submission);

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
