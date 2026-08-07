import type { AssistantResponse } from "../types/bankruptcy";

/**
 * Real assistant responses, transcribed verbatim from a live run.
 *
 * These are not invented fixtures. Every field below was produced by the
 * Strands agent layer talking to a running Ollama (`llama3.1:8b`) against the
 * synthetic case in `backend/scripts/live_agent_turns.py` — the same case the
 * backend suite uses, whose figures are known: net income 2058.33/mo, expenses
 * 1750/mo, cash flow 308.33/mo, total debt 18000, one piece of evidence
 * already received.
 *
 * The full capture, including the turns not quoted here, is in
 * `docs/evidence/live-agent-turns.json`. Re-record it with:
 *
 *     backend/.venv/Scripts/python.exe backend/scripts/live_agent_turns.py \
 *         docs/evidence/live-agent-turns.json
 *
 * Why transcribe instead of reading the JSON at test time: these tests must
 * stay deterministic and must not need a model to run in CI. What the live run
 * buys is that the *shape and wording* the UI is tested against is shape and
 * wording a model actually emitted — including its rough edges, which is how
 * two of them (English labels on a Spanish turn, an empty `handled_by`) became
 * visible at all.
 */

/**
 * Turn 2 — `analysis_agent`, 35.5s. The figure is correct: 308.33 is exactly
 * the case's monthly cash flow.
 *
 * Note the action label. The turn was Spanish, the model wrote "Next Step" in
 * English. Kept as recorded — the UI renders whatever label arrives, and a
 * fixture that quietly translated it would hide the defect.
 */
export const ANALYSIS_CASH_FLOW_TURN: AssistantResponse = {
  language: "es",
  message:
    "Basándome en la información proporcionada por la herramienta, tu flujo de efectivo mensual es de $308.33 después de pagar todas tus deudas y gastos.",
  handled_by: "analysis_agent",
  actions: [
    {
      id: "next-step",
      action_type: "open_page",
      resource: "review",
      resource_id: null,
      label: "Next Step",
      icon: "chat",
      payload: {},
      requires_confirmation: false,
    },
  ],
  cards: [],
  warnings: [],
  requires_attorney_review: false,
  degraded: false,
  disclaimer:
    "Esta orientacion organiza informacion y preguntas. No determina elegibilidad, no sustituye el means test oficial y no es asesoramiento legal.",
};

/** Turn 7 — `case_agent`, attorney session, 22.8s. The only turn of the eight
 * that produced a card. */
export const ATTORNEY_SUMMARY_TURN: AssistantResponse = {
  language: "es",
  message: "El estado actual del expediente es en curso, con un avance avanzado y documentos pendientes.",
  handled_by: "case_agent",
  actions: [
    {
      id: "1",
      action_type: "open_page",
      resource: "overview",
      resource_id: null,
      label: "Resumen del Expediente",
      icon: "briefcase",
      payload: {},
      requires_confirmation: false,
    },
  ],
  cards: [
    {
      card_type: "summary",
      title: "Estado del caso",
      description: "Resumen del expediente",
      data: {
        outstanding_info: "documentos pendientes",
        progress: "avanzado",
        stage: "en curso",
      },
    },
  ],
  warnings: [],
  requires_attorney_review: true,
  degraded: false,
  disclaimer:
    "Esta orientacion organiza informacion y preguntas. No determina elegibilidad, no sustituye el means test oficial y no es asesoramiento legal.",
};

/**
 * Turn 5 — "¿Califico para el capítulo 7?", 20.9s.
 *
 * The agent path did not answer this one; the deterministic draft did, and the
 * response says so with `degraded: true`. That is the behaviour worth pinning:
 * the eligibility question is exactly the one the product must never answer,
 * and the fallback refuses it, routes to the chapter comparison, and raises
 * `requires_attorney_review`.
 */
export const ELIGIBILITY_DEGRADED_TURN: AssistantResponse = {
  language: "es",
  message:
    "Chapter 7 suele enfocarse en liquidación y descarga de deudas elegibles, pero requiere revisar means test, bienes, exenciones y transacciones recientes con un abogado.",
  handled_by: "deterministic",
  actions: [
    {
      id: "focus-section",
      action_type: "open_page",
      resource: "chapter-comparison",
      resource_id: null,
      label: "Abrir la sección recomendada",
      icon: "arrow-right",
      payload: {},
      requires_confirmation: false,
    },
    {
      id: "suggested-0",
      action_type: "ask",
      resource: "chapter-comparison",
      resource_id: null,
      label: "¿Qué resultado produce el means test vigente para Puerto Rico y el tamaño del hogar?",
      icon: "chat",
      payload: {},
      requires_confirmation: false,
    },
    {
      id: "suggested-1",
      action_type: "ask",
      resource: "chapter-comparison",
      resource_id: null,
      label: "¿Qué bienes podrían estar protegidos por exenciones aplicables?",
      icon: "chat",
      payload: {},
      requires_confirmation: false,
    },
  ],
  cards: [],
  warnings: [],
  requires_attorney_review: true,
  degraded: true,
  disclaimer:
    "Esta orientacion organiza informacion y preguntas. No determina elegibilidad, no sustituye el means test oficial y no es asesoramiento legal.",
};
