import { useCallback } from "react";
import type { BankruptcyCase, EntryKind, EntrySubmission } from "../../types/bankruptcy";
import { useBankruptcyWorkspace } from "../../workspace/BankruptcyWorkspaceContext";

export interface CaseEntryActions {
  update: (updater: (value: BankruptcyCase) => BankruptcyCase) => void;
  addEntry: (submission: EntrySubmission) => void;
  removeEntry: (kind: EntryKind, entryId: string) => void;
  toggleUrgentCollectionAction: () => void;
}

/**
 * Every write the workspace page performs against a case.
 *
 * Collected here so the page composes mutations instead of defining them, and
 * so the mapping from an `EntryKind` to the list it belongs in exists once. In
 * the page it appeared twice — once in `addEntry`'s if-chain and once in
 * `removeEntry`'s five ternaries — which is two places to update when a kind is
 * added, and only one of them would fail loudly.
 *
 * `caseId` is a parameter rather than read from the router so the hook can be
 * exercised without a route, and so a caller can never mutate a different case
 * than the one it is rendering.
 */
export function useCaseEntries(caseId: string): CaseEntryActions {
  const workspace = useBankruptcyWorkspace();

  const update = useCallback(
    (updater: (value: BankruptcyCase) => BankruptcyCase) => workspace.updateCase(caseId, updater),
    [workspace, caseId],
  );

  const addEntry = useCallback(
    (submission: EntrySubmission) => {
      update((current) => {
        switch (submission.kind) {
          case "income":
            return { ...current, incomes: [...current.incomes, submission.value] };
          case "expense":
            return { ...current, expenses: [...current.expenses, submission.value] };
          case "debt":
            return { ...current, debts: [...current.debts, submission.value] };
          case "asset":
            return { ...current, assets: [...current.assets, submission.value] };
          default:
            return { ...current, evidence: [...current.evidence, submission.value] };
        }
      });
    },
    [update],
  );

  const removeEntry = useCallback(
    (kind: EntryKind, entryId: string) =>
      update((current) => ({
        ...current,
        incomes: kind === "income" ? current.incomes.filter((item) => item.id !== entryId) : current.incomes,
        expenses: kind === "expense" ? current.expenses.filter((item) => item.id !== entryId) : current.expenses,
        debts: kind === "debt" ? current.debts.filter((item) => item.id !== entryId) : current.debts,
        assets: kind === "asset" ? current.assets.filter((item) => item.id !== entryId) : current.assets,
        evidence: kind === "evidence" ? current.evidence.filter((item) => item.id !== entryId) : current.evidence,
      })),
    [update],
  );

  const toggleUrgentCollectionAction = useCallback(
    () =>
      update((current) => ({
        ...current,
        household: {
          ...current.household,
          urgentCollectionAction: !current.household.urgentCollectionAction,
        },
      })),
    [update],
  );

  return { update, addEntry, removeEntry, toggleUrgentCollectionAction };
}
