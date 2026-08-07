import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaseActionBar } from "./CaseActionBar";
import type { BankruptcyCase } from "../../types/bankruptcy";

function makeCase(overrides: Partial<BankruptcyCase> = {}): BankruptcyCase {
  return {
    id: "case-test",
    ownerUserId: "client-demo",
    clientName: "Elena Rivera",
    clientEmail: "client@freshstart.demo",
    preferredLanguage: "es",
    status: "submitted",
    household: {
      householdSize: 2,
      dependents: 0,
      filingJointly: false,
      urgentCollectionAction: false,
      recentPropertyTransfer: false,
    },
    incomes: [],
    expenses: [],
    debts: [],
    assets: [],
    evidence: [],
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    messages: [],
    timeline: [],
    ...overrides,
  };
}

/**
 * The bar renders a single `ActionGroup` now, not nine flat buttons: requesting
 * a document is the primary segment, everything else is behind the menu. These
 * helpers express that so each test still asserts on behaviour rather than on
 * the markup that produces it.
 */
function openMenu() {
  // The trigger toggles, so clicking an already-open menu would close it —
  // open only when it is not on screen yet.
  if (!screen.queryByRole("menu")) {
    fireEvent.click(screen.getByRole("button", { name: /Más acciones/ }));
  }
  return screen.getByRole("menu");
}

function clickMenuItem(name: RegExp) {
  fireEvent.click(within(openMenu()).getByRole("menuitem", { name }));
}

describe("CaseActionBar", () => {
  it("opens the 'Solicitar documento' modal and adds a requested-evidence entry on submit", () => {
    const caseData = makeCase();
    const onUpdate = vi.fn((updater: (value: BankruptcyCase) => BankruptcyCase) => updater(caseData));
    render(
      <CaseActionBar
        caseData={caseData}
        analysis={null}
        onUpdate={onUpdate}
        onMarkUrgent={() => {}}
        onOpenAttorneyReviewTab={() => {}}
      />,
    );

    // Modal is not rendered/visible until the action button is clicked.
    expect(screen.queryByText("El documento aparecerá como pendiente en el expediente del cliente.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Solicitar documento/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Solicitar documento")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Solicitar/ }));

    expect(onUpdate).toHaveBeenCalled();
    const updated = onUpdate.mock.results[0]!.value as BankruptcyCase;
    expect(updated.evidence).toHaveLength(1);
    expect(updated.evidence[0]?.status).toBe("requested");
  });

  it("toggles the urgent-marking button label based on current state", () => {
    const onMarkUrgent = vi.fn();
    const { rerender } = render(
      <CaseActionBar
        caseData={makeCase({ household: { householdSize: 1, dependents: 0, filingJointly: false, urgentCollectionAction: false, recentPropertyTransfer: false } })}
        analysis={null}
        onUpdate={() => {}}
        onMarkUrgent={onMarkUrgent}
        onOpenAttorneyReviewTab={() => {}}
      />,
    );
    expect(within(openMenu()).getByRole("menuitem", { name: /Marcar urgente/ })).toBeInTheDocument();

    rerender(
      <CaseActionBar
        caseData={makeCase({ household: { householdSize: 1, dependents: 0, filingJointly: false, urgentCollectionAction: true, recentPropertyTransfer: false } })}
        analysis={null}
        onUpdate={() => {}}
        onMarkUrgent={onMarkUrgent}
        onOpenAttorneyReviewTab={() => {}}
      />,
    );
    expect(within(screen.getByRole("menu")).getByRole("menuitem", { name: /Quitar urgencia/ })).toBeInTheDocument();

    clickMenuItem(/Quitar urgencia/);
    expect(onMarkUrgent).toHaveBeenCalledOnce();
  });

  it("jumps to the attorney review tab via the quick 'Cambiar estado' action", () => {
    const onOpenAttorneyReviewTab = vi.fn();
    render(
      <CaseActionBar
        caseData={makeCase()}
        analysis={null}
        onUpdate={() => {}}
        onMarkUrgent={() => {}}
        onOpenAttorneyReviewTab={onOpenAttorneyReviewTab}
      />,
    );
    clickMenuItem(/Cambiar estado/);
    expect(onOpenAttorneyReviewTab).toHaveBeenCalledOnce();
  });
});
