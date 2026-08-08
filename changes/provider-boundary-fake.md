---
taskId: provider-boundary-fake
type: test
scope: agentic runtime verification
---
# Summary

A fake model at the provider boundary, and the four tests it unlocks. This
closes R3's last unproven link — HTTP → authorized portfolio → Strands →
`portfolio_agent` → a real `PortfolioTools` method → structured answer,
`degraded=false` — without any credential.

Backend **329 → 333 passed**.

# What is faked, and what is not

Only `strands.models.model.Model`. The orchestrator, specialist selection, the
tool registry, `CaseTools`, `PortfolioTools`, authorization, the context
builder, `AgentRuntime`, schema validation and the guardrails all run exactly as
they do in production, driven from a real HTTP request through the real router.

# It reacts; it does not replay

A scripted queue of responses would pass whatever the runtime did — including
nothing. If Strands stopped invoking tools, a queue would still hand back the
final answer and the test would stay green while the product had silently
stopped consulting the case.

So the fake reads the `tool_specs` it is offered each turn and calls the first
name it was told to prefer. Specialists are themselves tools on the
orchestrator, so one list — `["portfolio_agent", "list_cases_needing_attention"]`
— walks the whole delegation chain without the fake knowing the hierarchy
exists. A tool that stops being registered simply cannot be called, and the test
fails.

**And it refuses to produce a final answer before a data tool has run.** That
guard is what makes every assertion above mean something, and it has its own
test.

# What building it revealed about Strands

`Model.structured_output` is never called. Strands presents the schema as a
synthetic tool — literally named `AgentAnswer` — and *forces* a call to it. The
observed turn sequence:

```text
0  orchestrator  [case_agent, analysis_agent, documents_agent, support_agent, AgentAnswer]
1  specialist    [get_case_summary, get_missing_information]   ← the real tool runs here
2  specialist    (no preference left → text)
3  orchestrator  (no preference left → text)
4  orchestrator  [AgentAnswer]                                  ← forced
```

That is a sharper confirmation of the Ollama finding than the original
measurement. The mechanism the runtime depends on is *forced tool choice*, and
`strands/models/ollama.py` ignores it while `openai.py` implements it — so the
model never calls the schema tool, the structured output is absent, and the turn
degrades. Not a prompt problem, not a model-size problem: a missing feature in
one adapter.

The fake takes the schema tool only after every data preference is exhausted, so
it can never pre-empt the tools it exists to drive.

# Tests and evidence

- `tests/support/fake_model.py` plus `tests/test_agentic_runtime_path.py`, 4
  cases. Backend **329 → 333 passed**, `ruff` clean, `mypy` clean (71 files).
- Client case path: `data_tools_invoked == ["get_missing_information"]`,
  `degraded=false`, `handled_by` naming the tool.
- Attorney portfolio path: `portfolio_agent` invoked, then
  `list_cases_needing_attention`, `degraded=false` — R3's remaining assertion.
- The observability trace records `runtime_mode="agentic"`, which is the two
  features checking each other.
- One test asserts the fake refuses to answer without a tool, because a fake
  that could fake success would invalidate the other three.

# Risks / limitations

**The fake chooses tools; a real model reasons about them.** These tests prove
the runtime accepts a well-formed agentic answer and that real tools produce the
data behind it. They cannot prove a real model picks the *right* specialist for a
question — that is what `LIVE_AGENT_PROVIDER_VERIFICATION` is for, and it remains
the only external blocker.

**`_settings_override` reaches into `app.dependency_overrides`.** It is the
supported FastAPI seam, but it means these tests know the app builds settings
through DI; a change to how settings are resolved would need it updated.

**The turn sequence above is observed, not contracted.** A future Strands version
could stop forcing the schema tool and start calling `Model.structured_output`
instead. The fake implements both paths with the same guard, so that change
surfaces as a passing test rather than a mysterious failure.
