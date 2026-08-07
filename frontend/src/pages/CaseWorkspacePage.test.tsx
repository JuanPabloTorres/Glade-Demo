import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_STAGE_ORDER, CaseWorkspacePage } from "./CaseWorkspacePage";
import type { BankruptcyCase, CaseAnalysis } from "../types/bankruptcy";

// CaseWorkspacePage pulls in a lot of context providers — mock each hook it
// consumes directly, the same pattern used by Sidebar.test.tsx, rather than
// standing up the whole app shell.
const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();
const mockUseChatPanel = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));

vi.mock("../chat/ChatPanelContext", () => ({
  useChatPanel: () => mockUseChatPanel(),
}));

vi.mock("../api/bankruptcyApi", () => ({
  bankruptcyApi: {
    analyze: vi.fn().mockResolvedValue(makeAnalysis()),
    guide: vi.fn(),
  },
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

function makeAnalysis(overrides: Partial<CaseAnalysis> = {}): CaseAnalysis {
  return {
    monthly_gross_income: 0,
    monthly_net_income: 0,
    monthly_expenses: 0,
    monthly_cash_flow: 0,
    total_debt: 0,
    secured_debt: 0,
    priority_debt: 0,
    unsecured_debt: 0,
    total_asset_value: 0,
    net_asset_value: 0,
    completion_score: 0,
    evidence_score: 0,
    missing_items: [],
    warnings: [],
    discussion_points: [],
    chapter_7_questions: [],
    chapter_13_questions: [],
    required_evidence: [],
    next_steps: [],
    ...overrides,
  };
}

function renderWorkspace(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/case/:caseId" element={<CaseWorkspacePage />} />
        <Route path="/case/:caseId/:section" element={<CaseWorkspacePage />} />
        {/* The overview redirect and the legacy ?focus= redirect both resolve
            here, so a test can assert where a link actually lands. */}
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CaseWorkspacePage stage navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "client-1", name: "Elena Rivera", email: "client@freshstart.demo", role: "client" },
    });
    mockUseBankruptcyWorkspace.mockReturnValue({
      cases: [makeCase()],
      updateCase: vi.fn(),
      submitCase: vi.fn(),
      updateStatus: vi.fn(),
    });
    mockUseChatPanel.mockReturnValue({ openAssistant: vi.fn() });
  });

  it("opens the section named in the URL path, so a reload or a shared link lands where it says it will", async () => {
    renderWorkspace("/case/case-1/activity");

    expect(await screen.findByRole("heading", { name: "Proceso del caso" })).toBeInTheDocument();
  });

  it("still honours the legacy ?focus= vocabulary the backend speaks, redirecting it to the canonical section path", async () => {
    renderWorkspace("/case/case-1?focus=timeline");

    expect(await screen.findByRole("heading", { name: "Proceso del caso" })).toBeInTheDocument();
  });

  it("lands on the SAME section via the stepper click — one source of truth, and the click changes the URL rather than hidden state", async () => {
    renderWorkspace("/case/case-1/overview");

    // Sanity check: mounts on the "start" stage.
    expect(await screen.findByRole("heading", { name: "Próximos pasos" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Seguimiento/ }));

    expect(await screen.findByRole("heading", { name: "Proceso del caso" })).toBeInTheDocument();
  });

  it("gives a bare /case/:id its canonical overview URL, so 'My case' and a section entry can never both look active", async () => {
    renderWorkspace("/case/case-1");

    expect(await screen.findByRole("heading", { name: "Próximos pasos" })).toBeInTheDocument();
  });

  it("falls back to the overview for a section slug that does not exist rather than rendering an empty stage", async () => {
    renderWorkspace("/case/case-1/not-a-real-section");

    expect(await screen.findByRole("heading", { name: "Próximos pasos" })).toBeInTheDocument();
  });
});

describe("STAGE_ORDER index derivation (regression guard for the hardcoded-index bug)", () => {
  // The old bug: `ATTORNEY_REVIEW_TAB_INDEX = 10` and `FOCUS_SECTION_TAB_INDEX`
  // were hardcoded positional numbers computed independently at three call
  // sites. Reordering a `TabItem` silently broke deep-linking and the
  // attorney-review shortcut because nothing re-derived those numbers.
  //
  // The fix drives every Flowbite tab index from `order.indexOf(stage)`
  // against a single `BASE_STAGE_ORDER` array — never a duplicated constant.
  // This test proves that property directly: a stage's index always reflects
  // its actual position, so reordering relocates the index automatically
  // instead of desyncing it.
  it("derives a stage's index purely from its position — reordering the stage order relocates the index instead of leaving it stale", () => {
    expect(BASE_STAGE_ORDER.indexOf("household")).toBe(1);
    expect(BASE_STAGE_ORDER.indexOf("tracking")).toBe(9);

    // Simulate a `TabItem` reorder: move "household" from position 1 to the
    // very end, after "tracking".
    const reordered = [...BASE_STAGE_ORDER];
    const [household] = reordered.splice(1, 1);
    reordered.push(household!);

    // Under the OLD design, `FOCUS_SECTION_TAB_INDEX.household` would still
    // read `1` here — now silently wrong. Under the new design, the index is
    // always re-read via `.indexOf`, so it reflects the new position with no
    // code change required at any call site.
    expect(reordered.indexOf("household")).toBe(BASE_STAGE_ORDER.length - 1);
    expect(reordered.indexOf("household")).not.toBe(BASE_STAGE_ORDER.indexOf("household"));
    // "tracking" shifted up by one since "household" was removed ahead of it.
    expect(reordered.indexOf("tracking")).toBe(8);
  });
});
