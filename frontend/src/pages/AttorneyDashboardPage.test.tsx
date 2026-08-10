import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankruptcyCase } from "../types/bankruptcy";
import { AttorneyDashboardPage } from "./AttorneyDashboardPage";

const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();
const mockListPortfolio = vi.hoisted(() => vi.fn());

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));

vi.mock("../api/bankruptcyApi", () => ({
  bankruptcyApi: {
    listPortfolio: mockListPortfolio,
  },
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
    mockListPortfolio.mockReset().mockResolvedValue([
      {
        case_id: "case-client",
        client_name: "Elena Rivera",
        status: "draft",
        owner_user_id: "client-demo",
        urgent_collection_action: false,
        has_collection_lawsuit: false,
        income_count: 0,
        expense_count: 0,
        debt_count: 0,
        asset_count: 0,
        evidence_count: 0,
        updated_at: "2026-08-05T00:00:00.000Z",
      },
    ]);
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

  it("does not offer legacy attorney-owned drafts as reviewable client cases", async () => {
    render(
      <MemoryRouter>
        <AttorneyDashboardPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("Elena Rivera")).length).toBeGreaterThan(0);
    expect(screen.queryByText("attorney@freshstart.demo")).not.toBeInTheDocument();
  });

  it("only offers cases confirmed by the server portfolio, including persisted empty cases", async () => {
    mockUseBankruptcyWorkspace.mockReturnValue({
      cases: [
        makeCase(),
        makeCase({
          id: "case-2c7c3a36-8ba4-4fc2-8036-bd9dfb504262",
          ownerUserId: "client-demo",
          clientName: "Lic. Andrea Morales",
          clientEmail: "attorney@freshstart.demo",
        }),
      ],
      updateCase: vi.fn(),
      deleteCase: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AttorneyDashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockListPortfolio).toHaveBeenCalledOnce());
    expect((await screen.findAllByText("Elena Rivera")).length).toBeGreaterThan(0);
    expect(screen.queryByText("attorney@freshstart.demo")).not.toBeInTheDocument();
  });
});
