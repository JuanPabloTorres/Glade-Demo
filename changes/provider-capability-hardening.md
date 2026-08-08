---
taskId: provider-capability-hardening
type: patch
scope: AI provider capability
---
# Summary

Makes the runtime refuse an agentic provider that cannot honour the contract it
depends on, instead of discovering that after a model round trip. Item 1 of the
ordered close-out, and it encodes the finding from
`docs/audits/STRANDS-ACCEPTANCE-AUDIT.md` as behaviour rather than prose.

The fallback is not weakened. It is reached sooner, and it says why.

# What changed

`STRUCTURED_OUTPUT_PROVIDERS` and `supports_forced_structured_output()` in
`model_factory.py` state which providers can be *forced* to return the
`AgentAnswer` schema. `AgentRuntime._agents_enabled` consults it before a model
is built: a provider that routes through Strands but cannot honour the contract
degrades immediately with a diagnostic naming the cause and the fix.

**Measured:** an Ollama turn went from **23.8s to 0ms**, reaching the same
deterministic answer. Previously the agent ran, called real tools, produced an
unusable result and had it discarded — 1 to 24s of latency depending on the
model, for nothing.

Capability is a property of the *adapter*, not the vendor or the model size:
`strands/models/ollama.py` calls `warn_on_tool_choice_not_supported`, while
`strands/models/openai.py` implements `_format_request_tool_choice`. The
docstring records the three-model measurement so the next reader does not have to
re-derive it.

`.env.example` now says which provider can run the agentic path and which
cannot, with Ollama marked experimental and local-only.

# Why the nomenclature was left alone

`AI_PROVIDER=openai` already means "any OpenAI-compatible endpoint":
`_create_openai_compatible` selects the Chat Completions protocol when
`OPENAI_BASE_URL` is set, and its docstring already explains that the Responses
API is OpenAI-only and that this is what makes Groq, Cerebras and OpenRouter
usable. That is the right abstraction under a reasonable name, so it was
documented rather than renamed.

# Nine existing tests were passing for the wrong reason

`test_agent_runtime.py` used `ai_provider="ollama"` as shorthand for "the agent
path is enabled" in nine places. Three failed outright under the new check. The
other six kept passing — while asserting the deterministic answer in the belief
that they were exercising the agent, because the runtime now degrades before the
patched `_run_agents` is ever reached.

They now use `AGENTIC_PROVIDER = OPENAI`, with the reasoning recorded next to the
constant. No credential is needed: every one of them patches `_run_agents` or its
collaborators, so `ModelFactory.create` — where the key is read — is never
reached. The one test that is *about* a missing key still sets it explicitly.

That silent-pass window is the more interesting half of this change. A capability
check that broke three tests loudly and left six quietly wrong would have been a
worse outcome than no check at all.

# User-visible behavior

None on the default `rule_based` deployment. An Ollama-configured deployment gets
the same answer, instantly instead of after a wait.

# Tests and evidence

- New `tests/test_provider_capabilities.py`, 9 cases. Backend **283 → 292
  passed**, `ruff` clean, `mypy` clean (69 files).
- One test replaces `ModelFactory.create` with a function that raises, so a
  runtime that still reached the model fails loudly rather than passing on a
  slow discarded call.
- One asserts the log names both the cause and `OPENAI_BASE_URL`, because a
  silent degrade is the failure mode this replaces.
- Three assert the fallback is not weakened: the deterministic answer still
  carries a navigable action, a card and the disclaimer; a boundary question
  still raises `requires_attorney_review` with no agent in the loop; and
  `rule_based` is unaffected.

# Risks / limitations

**`STRUCTURED_OUTPUT_PROVIDERS` is a hand-maintained list.** If a future Strands
release adds tool-choice support to the Ollama adapter, this list will be wrong
in the safe direction — refusing a provider that has become capable. The
docstring names the two SDK functions to re-check.

**LIVE_AGENT_PROVIDER_VERIFICATION remains BLOCKED_BY_EXTERNAL_CREDENTIAL.** No
`GROQ_API_KEY` or `OPENAI_API_KEY` is present in the process, user or machine
environment, in `.env`, or anywhere in the repository — searched before saying
so. This change makes the incompatible path fail loudly; it cannot prove the
compatible one succeeds.

**Items 2-17 of the ordered close-out are not started.** The next one is the
provider-boundary integration test, which needs a fake Strands model that emits
a valid structured result — real runtime, real tools, real guardrails, mock only
at the external boundary.
