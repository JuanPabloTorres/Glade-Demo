import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankruptcyCase } from "../types/bankruptcy";
import { AttorneyDashboardPage } from "./AttorneyDashboardPage";

const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));

function makeCase(overrides: Partial<BankruptcyCase> = {}): BankruptcyCase {
  return {
    id: "case-client",
    ownerUserId: "client-demo",
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

describe("AttorneyDashboardPage case authorization", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "attorney-demo",
        email: "attorney@freshstart.demo",
        name: "Lic. Andrea Morales",
        role: "attorney",
        preferred_language: "es",
      },
    });
    mockUseBankruptcyWorkspace.mockReturnValue({
      cases: [
        makeCase(),
        makeCase({
          id: "case-legacy-attorney-draft",
          ownerUserId: "attorney-demo",
          clientName: "Lic. Andrea Morales",
          clientEmail: "attorney@freshstart.demo",
        }),
      ],
      updateCase: vi.fn(),
      deleteCase: vi.fn(),
    });
  });

  it("does not offer legacy attorney-owned drafts as reviewable client cases", () => {
    render(
      <MemoryRouter>
        <AttorneyDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Elena Rivera").length).toBeGreaterThan(0);
    expect(screen.queryByText("attorney@freshstart.demo")).not.toBeInTheDocument();
  });
});
