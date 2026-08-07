---
taskId: vercel-agent-runtime
type: minor
scope: deployment dependencies, OpenAI model wiring, ADR 0002 amendment
---

# Summary

Makes the Strands agent actually run on the deployed demo. Until now Vercel
could only ever answer from the deterministic fallback, because the SDK was
deliberately excluded from the function's dependencies.

# Why the original decision failed

ADR 0002 kept `strands-agents` out of `requirements.txt` on the grounds that
the function ran `AI_PROVIDER=rule_based` anyway, so the SDK would be "dead
weight in a size-constrained runtime". Both halves of that failed.

The first half was circular: the function ran `rule_based` *because* the SDK
was absent. Asked to demonstrate the agent, the deployment could not, and no
configuration would have changed it.

The second half was never measured. A clean install of `requirements.txt` is
**101 MB**; with `strands-agents[openai]` it is **163 MB**, against Vercel's
250 MB unzipped limit — not close to the constraint it was rejected for. The ML
stack it was grouped with (torch, transformers, docling) genuinely is, and
stays excluded; the dependency test now enforces both directions.

# What changed

`strands-agents[openai]>=1.50,<2.0` ships in the function. OpenAI rather than
Ollama because Ollama needs a model server on localhost and a serverless
function has none.

`api/index.py` sets `AI_PROVIDER=openai` unconditionally. That is safe because
of a property ADR 0002 already established: with no `OPENAI_API_KEY` the model
factory raises `MissingModelCredentialsError`, `AgentRuntime` catches it, and
the answer is the deterministic draft marked `degraded: true`. A deployment
without the key behaves exactly as it did before; one with the key gains the
agent.

# The defect this surfaced

`ModelFactory._create_openai` passed `settings.ai_model_id` as the model. That
setting belongs to the *transformers* provider and defaults to
`Qwen/Qwen3-0.6B`, a HuggingFace repo id. OpenAI would have rejected every
call, and the runtime converts a failed call into a silent degrade — so the
observable symptom would have been "the agent is configured and never
answers", with nothing in the response explaining why.

OpenAI now has `openai_model`, defaulting to `gpt-4o-mini`, mirroring the
`ollama_model` setting that already existed. Nobody would have found this from
the logs; it would have looked like the agent simply not working.

# Migration / compatibility

Additive. One new setting. Local and Render deployments are unaffected — they
read `AI_PROVIDER` from their own environment and default to `rule_based`.

Anyone who had already set `AI_PROVIDER=openai` and `AI_MODEL_ID` to an OpenAI
model should move that value to `OPENAI_MODEL`; `AI_MODEL_ID` no longer reaches
the OpenAI path.

# Tests and evidence

- `test_agent_wiring_integration.py`: the factory builds a real
  `OpenAIResponsesModel` against the installed SDK and its `model_id` is
  `openai_model`, asserted with `ai_model_id` simultaneously set to the
  HuggingFace default so a regression cannot pass by coincidence.
- `test_vercel_entrypoint.py`: the deployed function reports `openai` as its
  provider, does not use the HuggingFace id, and still serves a login and
  `/ai/health` with no key present — the "never 5xx" guarantee that lets the
  provider be set without the key.
- `test_production_dependencies.py`: the SDK must be present and
  version-bounded; the ML packages must stay absent.
- Size measured, not assumed: two clean `uv` environments, 101.2 MB vs 162.6 MB.
- Backend 177 tests, `ruff` and `mypy` clean.

# Risks / limitations

**No live OpenAI call has been made.** No `OPENAI_API_KEY` exists in this
environment, so what is proven is the wiring up to the SDK's model object — the
same limitation ADR 0002 recorded, now narrowed to one unverified hop. The
Ollama path *has* been exercised end to end
(`docs/evidence/live-agent-turns.json`), and both paths share every layer above
`ModelFactory`. Confirm one real turn after setting the key.

**Data egress.** `AI_PROVIDER=openai` sends reduced case context — income,
debts, and for an attorney session the private notes — to a third party. Every
case in this deployment is synthetic (AGENTS.md rule 9), which is what makes
this a demo decision rather than a disclosure one. It stops being true the
moment real information is entered.

**Cost and latency** rise per answered turn. `Limits(turns=8)` bounds the
orchestrator↔specialist round trips, and therefore both.
