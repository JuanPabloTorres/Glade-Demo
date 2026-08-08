# Strands acceptance audit — 4.9.0

Audited against the acceptance contract's §2–§13. Every claim below was produced
by running the code, not by reading it. Anything not exercised is marked
UNVERIFIED rather than assumed.

**Environment:** `strands-agents` installed; Ollama reachable with
`llama3.1:8b`, `llama3.1:8b-16k`, `llama3:latest`, `llama3.2:1b`. No OpenAI or
Groq key present.

---

## 1. The real request flow

Traced by instrumenting `CaseTools` with call spies and running
`AgentRuntime.execute` with `ai_provider="ollama"`:

```text
AgentRuntime.execute
  → deterministic draft computed FIRST, always
  → _agents_enabled()  → settings.ai_provider ∈ {openai, ollama}
  → AgentFactory.create_orchestrator()      [Strands Agent]
  → orchestrator(prompt, structured_output_model=AgentAnswer, limits=turns=8)
      → Tool #1: case_agent                 [specialist delegation, observed]
          → Tool #1: get_missing_information [real tool, spy confirmed]
              → CaseContextDto.missing_items [real data]
  → ResponseGuardrails.review()
  → AssistantResponse composed server-side
```

This is the contract's §2 flow. It is real: the orchestrator delegated to a
specialist, the specialist invoked a tool, and the tool returned the case's
actual missing items.

**PASS** — Strands participates in the request. It is not an unused import, a
wrapper outside the request path, or if/else dressed as reasoning.

## 2. Tools

`app/ai/tools/case_tools.py` exposes eight `@tool` functions:
`get_case_summary`, `get_missing_information`, `get_financial_snapshot`,
`get_review_questions`, `get_pending_documents`, `search_case_documents`,
`get_case_timeline`, `get_attorney_review_notes`.

They map onto the contract's §3 model: Case Context, Case Analysis / Financial
Summary, Missing Information, Evidence Search, Timeline, Workflow Guidance.
Conversation Context is not a tool — it arrives on `CaseContextDto.recent_conversation`.

**The authorization shape is stronger than the contract asks for.** No tool takes
a `case_id`, a `role`, or any authorization parameter. Both are closed over at
construction from the already-authorized `CaseContextDto`. A model may call every
tool in any order with any arguments and still cannot reach a case it was not
granted — the class of bug is removed rather than validated against.
`get_attorney_review_notes` additionally raises `ToolAuthorizationError` on a
non-attorney runtime, a third check behind the builder's redaction and the
factory's registration.

**PASS.**

## 3. Reasoning versus determinism

`get_financial_snapshot` returns figures computed by `BankruptcyAnalysisService`
and its docstring instructs the model to "report them as given; never recompute
or estimate them". `AgentRuntime.execute` computes the deterministic draft
**first, always** — for every request, including ones the agent goes on to
answer — and `requires_attorney_review` is the OR of the draft's verdict and the
guardrails', so a model can never lower it.

**PASS** — income, cash flow, debt and asset totals, completion and
authorization stay outside the LLM.

---

## 4. FAILED — the agent's answer never reaches the user on Ollama

**WHY.** Every turn returns `degraded=True, handled_by="deterministic"`. The
agent did the work — delegation and tool calls confirmed — and the runtime then
discarded it, answering from the deterministic draft. The user never sees an
agent-authored answer.

**ROOT CAUSE.** Not the model, not the prompt, not context size. Measured across
three models:

| model | result | latency |
| --- | --- | --- |
| `llama3.1:8b` | degraded | 23.8s |
| `llama3.1:8b-16k` | degraded | 9.4s |
| `llama3:latest` | degraded | 1.1s |

Strands emits a warning that names it:
`A ToolChoice was provided to this provider but is not supported and will be ignored`.
Confirmed in the SDK: `strands/models/ollama.py:325` calls
`warn_on_tool_choice_not_supported(tool_choice)`, while
`strands/models/openai.py:333` implements `_format_request_tool_choice`.

So structured output cannot be *forced* on the Ollama provider. The model emits
the `AgentAnswer` JSON as prose instead of a tool call, `result.structured_output`
is not an `AgentAnswer`, and `_run_agents` correctly returns `None`.

Observed verbatim in one run — note `"resource": "housing"`, which is not in
`ALLOWED_ACTION_RESOURCES` and would have been dropped by the allow-list even had
it parsed:

```text
I'm ready to help. What is the question that I should respond with a JSON for a
function call?{"name": "AgentAnswer", "parameters": {... "resource": "household"
... "resource": "housing" ...}}
```

**OWNER LAYER.** Provider selection and deployment configuration — not
`AgentRuntime`, whose degrade-instead-of-ship behaviour is correct and is the
reason a malformed answer never reached a user.

**FIX.** Route the demo through an OpenAI-compatible provider, which supports
tool choice. `.env.example` already documents this shape
(`OPENAI_BASE_URL=https://api.groq.com/openai/v1`), and the repository's own
history confirms it works there: `changes/groq-live-fixes.md` and
`AssistantAction.id`'s docstring record a live Groq run whose failure mode was
*schema validation of a real tool call*, which only happens when structured
output is being enforced.

If Ollama must stay, the alternative is to stop relying on forced structured
output there and parse the model's JSON defensively — a runtime change with its
own risks, and the worse option while a compatible provider is available.

**VERIFICATION.** Re-run the probe with `AI_PROVIDER=openai` and an OpenAI or
Groq key and assert `degraded=False` with `handled_by` naming a specialist. The
existing gate `cd backend && uv run pytest tests/evals` covers the deterministic
path; `EVAL_AI_PROVIDER=openai uv run python -m tests.evals.report` scores the
agent path against the same graders.

---

## 5. Consequence for the demo as configured

`ai_provider` defaults to `rule_based` in `app/core/config.py` and in
`.env.example`, and production was verified earlier to run that default. So:

- **Default configuration:** Strands is never invoked at all.
- **Ollama configuration:** Strands is invoked, calls real tools, and its answer
  is then discarded.

Neither configuration puts an agent-authored answer in front of a user today.
The deterministic path is good — it recognizes eligibility and filing questions,
grounds answers in the case's own figures and raises attorney review — but it is
not the agentic story the demo is meant to tell.

---

## 6. Not verified in this pass

Marked as such rather than assumed:

- **Attorney cross-case intelligence** (§8) — no tool exposes multiple cases;
  `CaseTools` is bound to exactly one authorized case. Answering "which of my
  cases need attention" would need a new authorized, attorney-scoped tool. Not
  built, not tested.
- **Conversation continuity** (§10) — `CaseContextDto.recent_conversation` is
  populated, but no multi-turn pronoun-resolution run was performed.
- **Operational observability** (§12) — tool invocations are visible on stdout
  through Strands' own output; there is no structured record of provider,
  latency, tools invoked or fallback reason.
- **i18n DOM audit** (§14–§18), **sidebar collapse** (§19–§20), **login
  centering** (§21–§24) — untouched in this pass.
