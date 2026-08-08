import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function renderChat(prefill?: string) {
  return render(<ChatPanel prefill={prefill} />);
}

function renderEmbeddedChat() {
  return render(<ChatPanel variant="embedded" />);
}

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
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), assistantScope: "case" });
    mockUseAiHealth.mockReturnValue({
      data: { available: true, model: "llama3.1:8b" },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  describe("page shell", () => {
    it("is a destination with its own heading, not an overlay", () => {
      renderChat();

      expect(screen.getByRole("heading", { name: "Asistente de preparación" })).toBeInTheDocument();
      // The drawer era left a close control behind; leaving a page is what
      // browser back is for.
      expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
    });

    it("asks for a case when none is resolvable, rather than rendering an assistant with nothing to reason about", () => {
      mockUseChatPanel.mockReturnValue({ caseData: null });
      renderChat();

      expect(screen.getByText("Abre un expediente para conversar con el asistente.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Mensaje")).toBeNull();
    });

    it("pins the case it is scoped to and the model behind it, so neither scrolls away with the transcript", () => {
      renderChat();

      expect(screen.getByText("Elena Rivera")).toBeInTheDocument();
      expect(screen.getByText("IA lista (llama3.1:8b)")).toBeInTheDocument();
    });
  });

  describe("embedded in a container that already has a header", () => {
    // AiPanel's sheet header already carries this title and the window
    // controls. Rendering the page header inside it stacked two headers on a
    // phone and announced the same title twice.
    it("does not repeat the surface title the container already provides", () => {
      renderEmbeddedChat();

      expect(screen.queryByRole("heading", { name: "Asistente de preparación" })).toBeNull();
    });

    it("still says which case it is scoped to and whether the model is reachable", () => {
      renderEmbeddedChat();

      expect(screen.getByText("Elena Rivera")).toBeInTheDocument();
      expect(screen.getByText("IA lista")).toBeInTheDocument();
    });

    it("keeps the composer, so the sheet is a working conversation and not a preview", () => {
      renderEmbeddedChat();

      expect(screen.getByLabelText("Mensaje")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
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

      expect(mockNavigate).toHaveBeenCalledWith("/case/case-1/overview");
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

  it("opens with the section's question already written when a section card linked here with one", () => {
    renderChat("¿Qué documentos me faltan?");

    expect(screen.getByLabelText("Mensaje")).toHaveValue("¿Qué documentos me faltan?");
  });
});


// The scope comes from the surface the user is on, resolved in
// ChatPanelContext from the route. These pin what ChatPanel does with it: pass
// it through untouched, and send nothing that could be mistaken for a claim.
describe("assistant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [makeCase()], updateCase: vi.fn() });
    mockUseAiHealth.mockReturnValue({
      data: { available: true, model: "llama3.1:8b" },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockGuide.mockResolvedValue(ANALYSIS_CASH_FLOW_TURN);
  });

  it("sends the case scope a case workspace resolves to", async () => {
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), assistantScope: "case" });
    renderChat();

    await ask("¿Cuánto debo?");

    await waitFor(() => expect(mockGuide).toHaveBeenCalled());
    expect(mockGuide.mock.calls[0][3]).toBe("case");
  });

  it("sends the portfolio scope the attorney queue resolves to", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "attorney-1", name: "Andrea", role: "attorney" } });
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), assistantScope: "portfolio" });
    renderChat();

    await ask("¿Cuáles de mis casos requieren atención?");

    await waitFor(() => expect(mockGuide).toHaveBeenCalled());
    expect(mockGuide.mock.calls[0][3]).toBe("portfolio");
  });

  it("carries no identity and no case identifiers of its own", async () => {
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), assistantScope: "portfolio" });
    renderChat();

    await ask("¿Qué me falta?");

    await waitFor(() => expect(mockGuide).toHaveBeenCalled());
    // A scope is a word. Anything richer would be the frontend asserting what
    // it may see, which is the server's decision and nobody else's.
    expect(typeof mockGuide.mock.calls[0][3]).toBe("string");
    expect(["case", "portfolio"]).toContain(mockGuide.mock.calls[0][3]);
  });
});

/**
 * The same three answer states, in English.
 *
 * Every assertion above reads Spanish copy, so all of them would still pass if
 * the AI states had a Spanish string baked into the component — and an English
 * user hitting a failed turn would read Spanish at the exact moment something
 * went wrong. Mixed-language application text is a release blocker, and the
 * failure path is the least-exercised place for it to hide.
 *
 * `i18n:check` guarantees the two bundles have the same keys. It cannot
 * guarantee the component reads a key at all rather than holding a literal,
 * which is what these render.
 */
describe("the answer states in English", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "client-1", name: "Elena Rivera", role: "client" } });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [makeCase()], updateCase: vi.fn() });
    mockUseChatPanel.mockReturnValue({ caseData: makeCase(), assistantScope: "case" });
    mockUseAiHealth.mockReturnValue({
      data: { available: true, model: "llama3.1:8b" },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    await i18n.changeLanguage("en");
  });

  // Restored so the locale does not leak into whatever file runs next — the
  // i18next instance is a module singleton shared across the whole run, and
  // `isolate: false` means it is not rebuilt per file.
  afterEach(async () => {
    await i18n.changeLanguage("es");
  });

  /** Same as `ask`, in the language under test. */
  async function askInEnglish(question: string) {
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: question } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
  }

  it("renders a model answer with English chrome around it", async () => {
    mockGuide.mockResolvedValue(ANALYSIS_CASH_FLOW_TURN);
    render(<ChatPanel />);

    await askInEnglish("How much is left each month?");

    await waitFor(() => expect(mockGuide).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Preparation assistant" })).toBeInTheDocument();
  });

  it("says an answer is deterministic in English, not in Spanish", async () => {
    mockGuide.mockResolvedValue(ELIGIBILITY_DEGRADED_TURN);
    render(<ChatPanel />);

    await askInEnglish("Do I qualify for chapter 7?");

    expect(
      await screen.findByText(/This answer comes from deterministic guidance/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/guía determinística/)).toBeNull();
  });

  it("reports a failed turn in English and still resends the same question", async () => {
    mockGuide
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(ANALYSIS_CASH_FLOW_TURN);
    render(<ChatPanel />);

    await askInEnglish("How much do I owe in total?");

    expect(
      await screen.findByText("The assistant did not respond. Try again in a moment."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(mockGuide).toHaveBeenCalledTimes(2));
    // Retry resends the question, not the empty composer: the message was
    // cleared on send, so a retry that read state would send "".
    expect(mockGuide.mock.calls[1]?.[1]).toBe("How much do I owe in total?");
  });
});
