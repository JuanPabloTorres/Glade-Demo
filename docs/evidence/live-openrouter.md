# Live provider gate — OpenRouter

What was verified against a real model, and what stopped it. No credential, key
fragment or account identifier appears in this file.

## Configuration

The existing OpenAI-compatible adapter, unchanged. No new provider class.

```env
AI_PROVIDER=openai
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=<model>
AI_MAX_OUTPUT_TOKENS=4000
```

`OPENAI_MODEL` is this repository's governed spelling of `AI_MODEL`; the key is a
`SecretStr`, so it cannot leak through a repr or a log line. The credential is read
from `.env`, which is untracked and gitignored.

## Step 1 — authentication

`GET /api/v1/key` → **OK**, free tier.

## Step 2 — model selection by capability

Of OpenRouter's free models, **13** declare `tools` support. A minimal tool-call probe
(one function, `tool_choice: required`) was sent to four:

| Model | Result |
|---|---|
| `nvidia/nemotron-3-super-120b-a12b:free` | tool call returned |
| `google/gemma-4-31b-it:free` | tool call returned |
| `nvidia/nemotron-3-nano-30b-a3b:free` | tool call returned |
| `openai/gpt-oss-20b:free` | HTTP 400 |

## Step 3 — the real runtime

The full chain, nothing faked: HTTP → auth → `CaseAccessService` → `AgentRuntime` →
Strands orchestrator → specialist → tool → Python service → `AgentAnswer` validation →
guardrails → response.

**The live agentic path works.** Observed on two models:

```text
degraded=false
runtime_mode=agentic
tool invoked: get_case_summary
```

The attorney portfolio specialist was also observed running against real
`PortfolioTools` and producing correct grounded content — *"Hay 1 expediente que
requiere atención inmediata debido a una demanda de cobro activa"*, which is exactly the
seeded case carrying the collection lawsuit — before the upstream connection timed out
on the final structured call.

Deterministic figures stayed deterministic throughout: the model reported
`completion_score 62` and `evidence_score 0` as given to it by the tool, and one run
shows it explicitly declining to estimate money it had not been handed.

## Step 4 — what blocks a reliable live demo

Not the code. Capacity.

| Failure | Source |
|---|---|
| HTTP 429, `limit_source: upstream_provider_shared_pool` | shared free pool |
| `ResourceExhausted: Worker local total request limit reached (32/32)` | NVIDIA upstream |
| `Provider timed out after ~12s` | upstream |
| `MaxTokensReachedException` | reasoning models spending the output budget on visible chain-of-thought before reaching the answer |

One agentic turn is 3–5 sequential model calls — orchestrator, specialist, tool result,
structured answer. That draws far more from a shared free pool than the single chat
completion a smoke test sends, which is why every isolated probe passed while full turns
fail intermittently. Runs alternate between clean `degraded=false` and three consecutive
rate-limited attempts on the *same* model.

The token cap was raised from 1500 to 4000 because a reasoning model spends the default
on chain-of-thought before emitting the `AgentAnswer` tool call. That is a budget, not a
guardrail: schema validation, the action allow-list and the `requires_attorney_review`
floor are untouched.

### Gate status per scope

| Scope | Live result |
|---|---|
| Client, case | **PASS** — `degraded=false`, `get_case_summary` invoked, on two models |
| Attorney, portfolio | **NOT PASSED** — specialist and `PortfolioTools` observed running with a correct answer, upstream timed out before the turn closed |
| Attorney, selected case | **NOT REACHED** — the run ahead of it never cleared the rate limiter |

A final attempt against `poolside/laguna-s-2.1:free` spent roughly 25 minutes in
retry backoff on a single turn, with 8× HTTP 429, and was abandoned. Runs are not
reproducible from one minute to the next on the same model, which is the specific
condition the release instruction warns against carrying into a presentation.

## Step 5 — fallback, verified live

Every failed turn degraded exactly as designed rather than erroring:

```text
degraded=true
fallback_reason=model_unavailable
requires_attorney_review=true (preserved)
```

with a useful deterministic answer, HTTP 200 throughout. This was not a simulated
outage — it is what a real overloaded provider produced.

## Observability

Trace fields emitted, confirmed complete and free of anything sensitive:

```text
agent · correlation_id · degraded · duration_ms · fallback_reason · handled_by
language · model · provider · role · runtime_mode · specialist · tool_status
tools_invoked
```

No API key, no prompt contents, no chain-of-thought, no case data.

## What is needed to close the gate

A model with capacity. Any of:

1. **Credits on the OpenRouter account** — pins a paid, reliable model.
2. **A BYOK provider key** attached in OpenRouter settings, so calls draw on that
   provider's quota instead of the shared pool.
3. **Any other OpenAI-compatible endpoint** with capacity; the adapter already supports
   it and needs only `OPENAI_BASE_URL` and a key.

No code change is required for any of them.

## Security note

A fragment of the current key was pasted into a chat transcript. It must be rotated
before it is used as a production secret, per the release instruction's own rule against
reusing a key that has appeared in chat, logs or history.
