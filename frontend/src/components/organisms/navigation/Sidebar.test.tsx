import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import type { BankruptcyCase } from "../../../types/bankruptcy";

const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));

function makeCase(overrides: Partial<BankruptcyCase> = {}): BankruptcyCase {
  return {
    id: "case-1",
    ownerUserId: "client-1",
    clientName: "Elena Rivera",
    clientEmail: "client@freshstart.demo",
    preferredLanguage: "es",
    status: "draft",
    household: {
      householdSize: 1,
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

function renderSidebar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("renders the full client nav and marks 'Inicio' active on the home route", () => {
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", email: "client@freshstart.demo", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [] });

    renderSidebar("/");

    ["Inicio", "Mi caso", "Documentos", "Tareas", "Actividad", "Ayuda"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("link", { name: /Inicio/ })[0]).toHaveAttribute("aria-current", "page");
  });

  it("disables case-scoped client nav items when the client has no active case yet", () => {
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", email: "client@freshstart.demo", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [] });

    renderSidebar("/");

    const myCaseButtons = screen.getAllByRole("button", { name: /Mi caso/ });
    expect(myCaseButtons[0]).toBeDisabled();
  });

  it("enables case-scoped client nav items once the client has an active case", () => {
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", email: "client@freshstart.demo", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [makeCase({ ownerUserId: "client-1" })] });

    renderSidebar("/");

    const myCaseLinks = screen.getAllByRole("link", { name: /Mi caso/ });
    expect(myCaseLinks[0]).toHaveAttribute("href", "/case/case-1");
  });

  it("renders the attorney nav (not the client nav) for an attorney user", () => {
    mockUseAuth.mockReturnValue({ user: { id: "attorney-1", name: "Casey Attorney", email: "attorney@freshstart.demo", role: "attorney" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [] });

    renderSidebar("/");

    ["Bandeja de casos", "Urgentes", "Documentos solicitados"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Mi caso")).toBeNull();
  });
});
