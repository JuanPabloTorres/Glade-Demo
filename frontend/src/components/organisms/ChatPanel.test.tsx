import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankruptcyCase } from "../../types/bankruptcy";
import {
  ANALYSIS_CASH_FLOW_TURN,
  ATTORNEY_SUMMARY_TURN,
  ELIGIBILITY_DEGRADED_TURN,
} from "../../test/liveAgentTurns";
import { ChatPanel } from "./ChatPanel";

// Same approach as CaseWorkspacePage.test.tsx and Sidebar.test.tsx: mock the
// hooks the component consumes rather than standing up the whole app shell.
const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();
const mockUseChatPanel = vi.fn();
const mockUseAiHealth = vi.fn();
const mockGuide = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../auth/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));
vi.mock("../../chat/ChatPanelContext", () => ({ useChatPanel: () => mockUseChatPanel() }));
vi.mock("../../hooks/useAiHealth", () => ({ useAiHealth: () => mockUseAiHealth() }));
vi.mock("../../api/bankruptcyApi", () => ({ bankruptcyApi: { guide: (...args: unknown[]) => mockGuide(...args) } }));
vi.mock("react-router", () => ({ useNavigate: () => mockNavigate }));

function makeCase(overrides: Partial<BankruptcyCase> = {}): BankruptcyCase {
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

function renderChat(open = true) {
  return render(<ChatPanel open={open} onClose={onClose} />);
}

const onClose = vi.fn();

/** Type the question and send it, the way a person does. */
async function ask(question: string) {
  fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
}

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [makeCase()], updateCase: vi.fn() });
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), prefill: "" });
    mockUseAiHealth.mockReturnValue({
      data: { available: true, model: "llama3.1:8b" },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  describe("dialog shell", () => {
    it("is a modal dialog composed from the governed shell, not a drawer", () => {
      renderChat();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(screen.getByRole("heading", { name: "Asistente de preparación" })).toBeInTheDocument();
    });

    it("renders nothing at all while closed", () => {
      renderChat(false);

      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("pins the case it is scoped to and the model behind it, so neither scrolls away with the transcript", () => {
      renderChat();

      expect(screen.getByText("Elena Rivera")).toBeInTheDocument();
      expect(screen.getByText("IA lista (llama3.1:8b)")).toBeInTheDocument();
    });

    it("invites a first question instead of opening on an empty box", () => {
      renderChat();

      expect(screen.getByText(/Pregunta lo que necesites sobre tu expediente/)).toBeInTheDocument();
    });
  });

  // Every response below is a verbatim transcript of what the agent layer
  // produced against a live model — see src/test/liveAgentTurns.ts and
  // docs/evidence/live-agent-turns.json.
  describe("real agent answers", () => {
    it("renders the analysis specialist's answer, and the figure in it is the case's actual cash flow", async () => {
      const updateCase = vi.fn();
      mockUseBankruptcyWorkspace.mockReturnValue({ cases: [makeCase()], updateCase });
      mockGuide.mockResolvedValue(ANALYSIS_CASH_FLOW_TURN);
      renderChat();

      await ask("¿Cuánto me queda cada mes después de pagar todo?");

      await waitFor(() => expect(mockGuide).toHaveBeenCalled());
      // The transcript is owned by the workspace, so the answer reaches the
      // bubbles through updateCase rather than local state. Assert on what was
      // written there: the reducer receives the message the agent produced.
      type Reducer = (current: BankruptcyCase) => BankruptcyCase;
      const appended = (updateCase.mock.calls as [string, Reducer][])
        .map(([, reducer]) => reducer(makeCase()))
        .flatMap((next) => next.messages)
        .map((entry) => entry.content);
      expect(appended).toContain(ANALYSIS_CASH_FLOW_TURN.message);
      expect(ANALYSIS_CASH_FLOW_TURN.message).toContain("$308.33");
    });

    it("renders the card the case specialist attached to its answer", async () => {
      mockGuide.mockResolvedValue(ATTORNEY_SUMMARY_TURN);
      renderChat();

      await ask("Resume el expediente para la consulta.");

      expect(await screen.findByRole("heading", { name: "Estado del caso" })).toBeInTheDocument();
      // The card's `data` is an open map the specialist fills in — every key it
      // chose has to survive to the UI, not just the ones a fixture anticipated.
      expect(screen.getByText("progress")).toBeInTheDocument();
      expect(screen.getByText("avanzado")).toBeInTheDocument();
      expect(screen.getByText("documentos pendientes")).toBeInTheDocument();
    });

    it("says an answer is deterministic when the agent path could not produce one, instead of passing the draft off as a model answer", async () => {
      mockGuide.mockResolvedValue(ELIGIBILITY_DEGRADED_TURN);
      renderChat();

      await ask("¿Califico para el capítulo 7?");

      expect(
        await screen.findByText(/Esta respuesta viene de la guía determinística/),
      ).toBeInTheDocument();
    });

    it("shows the disclaimer the server composed, never one written in the UI", async () => {
      mockGuide.mockResolvedValue(ANALYSIS_CASH_FLOW_TURN);
      renderChat();

      await ask("¿Cuánto me queda cada mes?");

      expect(await screen.findByText(ANALYSIS_CASH_FLOW_TURN.disclaimer)).toBeInTheDocument();
    });
  });

  describe("assistant actions", () => {
    it("puts an `ask` suggestion in the composer for the user to send, rather than sending it for them", async () => {
      mockGuide.mockResolvedValue(ELIGIBILITY_DEGRADED_TURN);
      renderChat();

      await ask("¿Califico para el capítulo 7?");

      const suggestion = await screen.findByRole("button", {
        name: "¿Qué bienes podrían estar protegidos por exenciones aplicables?",
      });
      fireEvent.click(suggestion);

      expect(screen.getByLabelText("Mensaje")).toHaveValue(
        "¿Qué bienes podrían estar protegidos por exenciones aplicables?",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("navigates and closes on a navigable action — the single affordance for it, now that the duplicate button beside the composer is gone", async () => {
      mockGuide.mockResolvedValue(ELIGIBILITY_DEGRADED_TURN);
      renderChat();

      await ask("¿Califico para el capítulo 7?");

      fireEvent.click(await screen.findByRole("button", { name: "Abrir la sección recomendada" }));

      expect(mockNavigate).toHaveBeenCalledWith("/case/case-1?focus=chapter-comparison");
      expect(onClose).toHaveBeenCalled();
      // The removed button carried this label from the frontend's locale file.
      // Nothing should render it any more: the only navigable control is the
      // chip above, whose label comes from the backend action.
      expect(screen.queryByRole("button", { name: "Abrir sección recomendada" })).toBeNull();
    });

    it("drops an action naming a resource the model invented, instead of rendering a button that goes nowhere", async () => {
      mockGuide.mockResolvedValue({
        ...ANALYSIS_CASH_FLOW_TURN,
        actions: [
          ...ANALYSIS_CASH_FLOW_TURN.actions,
          {
            id: "invented",
            action_type: "open_page" as const,
            resource: "means-test-calculator",
            resource_id: null,
            label: "Calcular el means test",
            icon: "calculator",
            payload: {},
            requires_confirmation: false,
          },
        ],
      });
      renderChat();

      await ask("¿Cuánto me queda cada mes?");

      expect(await screen.findByRole("button", { name: "Next Step" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Calcular el means test" })).toBeNull();
    });
  });

  describe("failure and offline states", () => {
    it("reports a failed turn and resends the same question on retry", async () => {
      mockGuide.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(ANALYSIS_CASH_FLOW_TURN);
      renderChat();

      await ask("¿Cuánto debo en total?");

      expect(await screen.findByText("El asistente no respondió. Intenta de nuevo en un momento.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

      await waitFor(() => expect(mockGuide).toHaveBeenCalledTimes(2));
      expect(mockGuide.mock.calls[1]?.[1]).toBe("¿Cuánto debo en total?");
    });

    it("keeps the offline notice with the composer, where it stays visible, and offers the recheck", () => {
      const refresh = vi.fn();
      mockUseAiHealth.mockReturnValue({ data: null, loading: false, error: null, refresh });
      renderChat();

      expect(screen.getByText("IA desconectada")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Reintentar conexión IA/ }));

      expect(refresh).toHaveBeenCalled();
    });
  });

  it("opens with the section's question already written when a section card asked for it", () => {
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), prefill: "¿Qué documentos me faltan?" });
    renderChat();

    expect(screen.getByLabelText("Mensaje")).toHaveValue("¿Qué documentos me faltan?");
  });
});
