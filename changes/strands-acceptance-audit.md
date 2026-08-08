---
taskId: strands-acceptance-audit
type: patch
scope: AI runtime verification
---
# Summary

Audits the agentic runtime against the acceptance contract's §2-§13 by running
it, not by reading it, and records one FAILED requirement with its root cause.

# What is real

Strands participates in the request. Instrumenting `CaseTools` with call spies
and running `AgentRuntime.execute` with `ai_provider="ollama"` produced an
observed chain: orchestrator delegates to `case_agent`, the specialist invokes
`get_missing_information`, the tool returns the case's actual missing items.
That is the contract's §2 flow, executing.

The eight tools map onto the §3 model, and their authorization shape is stronger
than the contract asks for: no tool takes a `case_id` or `role` — both are closed
over from the already-authorized `CaseContextDto`, so a model may call every tool
in any order and still cannot reach a case it was not granted.

§4's separation holds. `get_financial_snapshot` returns figures computed by
`BankruptcyAnalysisService` and forbids recomputation; the deterministic draft is
computed first for every request; `requires_attorney_review` is an OR the model
cannot lower.

# FAILED — the agent's answer never reaches the user

Every Ollama turn returns `degraded=True, handled_by="deterministic"`. The agent
does the work and the runtime discards it.

Root cause is not the model, prompt or context size — measured across
`llama3.1:8b` (23.8s), `llama3.1:8b-16k` (9.4s) and `llama3:latest` (1.1s), all
degraded. Strands warns `A ToolChoice was provided to this provider but is not
supported and will be ignored`, and the SDK confirms it:
`strands/models/ollama.py:325` calls `warn_on_tool_choice_not_supported`, while
`strands/models/openai.py:333` implements `_format_request_tool_choice`.
Structured output cannot be forced on Ollama, so the model emits the
`AgentAnswer` JSON as prose and `_run_agents` correctly returns `None`.

Owner layer is provider selection and deployment configuration, not
`AgentRuntime` — its degrade-instead-of-ship behaviour is what stopped a
malformed answer reaching a user. The fix is an OpenAI-compatible provider, the
shape `.env.example` already documents and that this repository's own Groq
history confirms works.

The consequence for the demo: `ai_provider` defaults to `rule_based`, so the
default configuration never invokes Strands at all, and the Ollama configuration
invokes it and discards the result. Neither puts an agent-authored answer in
front of a user today.

# User-visible behavior

None. Audit only; no code changed.

# Tests and evidence

`docs/audits/STRANDS-ACCEPTANCE-AUDIT.md` carries the traced flow, the
three-model measurement table, the verbatim malformed output and the SDK line
references. `npm run agent:validate` passes.

# Risks / limitations

Large parts of the contract were not exercised and are listed as UNVERIFIED
rather than assumed: attorney cross-case intelligence (no tool exposes more than
one case), multi-turn continuity, operational observability, the rendered-DOM
i18n audit, sidebar collapse, and login centering.
