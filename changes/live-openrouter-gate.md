---
taskId: live-openrouter-gate
type: chore
scope: live provider verification, regression and release evidence
---
# Summary

The live provider gate was run against OpenRouter through the existing OpenAI-compatible
adapter. No new provider class, no schema change, no relaxed validation.

**The live agentic path works.** It does not work *reliably* on OpenRouter's free tier,
and that is where the gate stops.

# What was verified

Authentication succeeded. Of OpenRouter's free models, 13 declare `tools` support; four
were probed with a minimal `tool_choice: required` call and three returned a valid tool
call.

Through the real runtime — HTTP, auth, `CaseAccessService`, `AgentRuntime`, Strands,
specialist, tool, service, `AgentAnswer` validation, guardrails — a client case turn
returned `degraded=false` with `get_case_summary` actually invoked, on two separate
models. The attorney portfolio specialist was observed running against real
`PortfolioTools` and producing the correct answer (the seeded case carrying the
collection lawsuit) before the upstream timed out on the final structured call.

Deterministic values stayed deterministic: the model reported the completion and evidence
scores it was handed, and in one run explicitly declined to estimate money no tool had
given it.

# What blocks it

Capacity, not code. HTTP 429 from the shared free pool, NVIDIA `ResourceExhausted
(32/32)`, ~12s upstream timeouts, across four models. One agentic turn is 3–5 sequential
model calls, so it draws far more from a shared pool than the single completion a smoke
test sends — which is why every isolated probe passed while full turns fail
intermittently. A final attempt spent ~25 minutes in retry backoff on one turn with 8×
429 and was abandoned.

# One configuration change

`AI_MAX_OUTPUT_TOKENS` 1500 → 4000 for the live run. Reasoning models spend the default
on visible chain-of-thought before reaching the `AgentAnswer` tool call and die with
`MaxTokensReachedException`. This is a token budget, not a guardrail: schema validation,
the action allow-list and the `requires_attorney_review` floor are untouched. It is set
in the environment, not committed.

# Fallback, verified against a real outage

Every failed turn degraded as designed — `degraded=true`,
`fallback_reason=model_unavailable`, `requires_attorney_review` preserved, a useful
deterministic answer, HTTP 200 throughout. This was not a simulated failure; it is what a
genuinely overloaded provider produced. §13's fallback requirement is met by accident of
circumstance, which is stronger evidence than a mock would have been.

# Observability

Trace fields confirmed complete and clean: agent, correlation_id, degraded, duration_ms,
fallback_reason, handled_by, language, model, provider, role, runtime_mode, specialist,
tool_status, tools_invoked. No key, no prompt contents, no chain-of-thought, no case data.

# Security

`.env` is untracked and gitignored; `openai_api_key` is a `SecretStr`. The verification
script lives outside the repository and is not committed. No key appears in source, git,
this document or any evidence file.

**A fragment of the current key was pasted into a chat transcript and must be rotated
before production use** — the release instruction's own rule.

# Risks / limitations

**No clean turn was achieved for the attorney portfolio or attorney selected-case
scopes.** The portfolio path is architecturally proven — the specialist ran and answered
correctly — but no turn closed with `degraded=false`. Claiming those two scopes passed
would be claiming something I did not observe.
