# AI Provider Architecture

Living document. Rewritten for 4.0.0, when the Strands Agents orchestration layer replaced the rewrite-only Ollama provider — see [ADR 0002](../decisions/0002-strands-agent-orchestration.md) for why, including the options that were rejected.

## Two layers, not one

Since 4.0.0 there are two distinct things behind `AI_PROVIDER`, and conflating them is the main way to misread this code:

| Layer | Module | Role |
|---|---|---|
| **Deterministic providers** | `backend/app/ai/providers/` | The floor. Always available, no model. `AgentRuntime` computes a draft from one of these on **every** request. |
| **Agent orchestration** | `backend/app/ai/` (`runtime.py`, `model_factory.py`, `agents/`, `tools/`, `prompts/`) | The Strands layer. Optional, model-backed, can fetch data through tools before answering. |

`AI_PROVIDER` selects which:

| Value | Layer | Network/model dependency |
|---|---|---|
| `rule_based` | Deterministic (default) | None — pure Python, always available |
| `transformers` | Deterministic + local rephrase | Local `torch`/`transformers` (`ai` extra) |
| `ollama` | Strands agents | Local/Docker/VPS Ollama at `OLLAMA_BASE_URL` (`agents` extra) |
| `openai` | Strands agents | OpenAI API, requires `OPENAI_API_KEY` (`agents` extra) — **sends reduced case context off-host** |

`OllamaProvider` no longer exists. Reaching a local Ollama model is now `ModelFactory`'s job via `strands.models.ollama`, not a hand-rolled `urllib` rewrite step.

## What changed, and what did not

**Changed.** A model can now decide what to look up. The orchestrator routes to a specialist (`Agent.as_tool()`), the specialist calls read-only tools, and the answer is built from what the tools returned.

**Not changed.** The model still cannot assert a fact the system did not give it, still cannot determine eligibility or choose a chapter, and still cannot make the assistant unavailable. Those are now enforced by four mechanisms rather than by "the model only rewrites prose":

1. **Narrowed output surface.** `AgentAnswer` is what a model may produce (message, handled_by, actions, cards). `AssistantResponse` is what the server returns. `AgentRuntime._compose` adds the mandatory disclaimer and computes `requires_attorney_review` as the OR of the deterministic draft's verdict and the guardrail verdict — a model cannot lower it.
2. **Structural case binding.** No tool takes a `case_id` or a `role`. `CaseTools` closes over the already-authorized `CaseContextDto` from `CaseAccessService`. A model can call every tool with any arguments and still cannot reach another case.
3. **Guardrails on every path.** `ResponseGuardrails` runs inside `AgentRuntime`, on agent output and on the deterministic fallback alike.
4. **Server-side action allow-list.** Actions naming a resource outside `ALLOWED_ACTION_RESOURCES` are dropped, not coerced. The frontend re-checks the same list (`frontend/src/api/assistantActions.ts`).

## Failure handling

`AgentRuntime.execute` computes the deterministic draft **first, always** — including on requests the agent goes on to answer. Any failure in the agent path returns that draft with `degraded=true`:

- `agents` extra not installed → `ImportError`, logged once, deterministic answer.
- `AI_PROVIDER=openai` with no key → `MissingModelCredentialsError`, deterministic answer. A missing key is a deployment state, not a request error.
- Model unreachable, timeout, or invalid structured output → deterministic answer.
- Anything else → caught by a second net in `execute` itself, so the no-5xx guarantee is a property of the entry point rather than of one internal method.

`degraded` is surfaced in the response rather than hidden, so the UI can say the answer came from deterministic guidance instead of presenting a rule-based draft as a model response.

`Limits(turns=8)` caps orchestrator↔specialist round trips, bounding cost and the blast radius of a prompt-injection attempt that tries to drive the loop.

## Specialists

Declared as data in `backend/app/ai/agents/factory.py:SPECIALISTS`, so the tool-to-agent grants are reviewable in one screen.

| Specialist | Tools | Notes |
|---|---|---|
| `case_agent` | `get_case_summary`, `get_missing_information` | Stage, progress, what is missing |
| `analysis_agent` | `get_financial_snapshot`, `get_review_questions` | Reports computed figures; never recomputes them |
| `documents_agent` | `get_pending_documents`, `search_case_documents`, `get_case_timeline` | Only tool reaching outside the reduced context |
| `support_agent` | *(none)* | Explains the product; no case-data access at all |
| `attorney_agent` | `get_attorney_review_notes`, `get_case_summary`, `get_review_questions` | Registered only on an attorney runtime; the tool re-checks the role anyway |

The orchestrator holds **no** data tool of its own — every fact must arrive through a specialist. Pinned by `test_agent_wiring_integration.py`.

Prompts live as Markdown under `backend/app/ai/prompts/{es,en}/`, with shared non-negotiables in `_common.md` prepended to each specialist prompt.

## Per-request construction

Strands `Agent` objects are never cached. They hold conversation state and are bound to one authorized case, so a process-wide instance would be shared memory between users. The `@lru_cache` on `providers/factory.py:get_provider` is safe only because every provider it builds is stateless.

Conversation history stays ours: `stateful=False` on the OpenAI model, with turns persisted to the `ai_conversations` table so history is case-scoped, auditable and deletable with the case.

## Configuration (`backend/app/core/config.py`, `.env.example`)

```env
AI_PROVIDER=rule_based        # rule_based | transformers | ollama | openai
AI_MODEL_ID=Qwen/Qwen3-0.6B   # transformers model id, or the OpenAI model id
AI_MAX_NEW_TOKENS=180         # transformers only
AI_TEMPERATURE=0.2            # both Strands providers
AI_MAX_OUTPUT_TOKENS=1500     # both Strands providers
OPENAI_API_KEY=               # required only when AI_PROVIDER=openai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text   # RAG embeddings, unrelated to AI_PROVIDER
```

`AI_PROVIDER` defaults to `rule_based` everywhere, including Vercel. `strands-agents` lives in the optional `agents` extra and is deliberately excluded from the trimmed function's `requirements.txt` — enforced by `backend/tests/test_production_dependencies.py`. `strands-agents-tools` is **not** a dependency: its prebuilt shell/file/Slack/AWS catalogue is exactly what must never reach these agents.

## Known gap

No live LLM has exercised this layer yet. The SDK integration is tested for real — agents construct, tool specs generate from docstrings and type hints, `as_tool()` delegation registers, role gating holds — but no environment in which it has been validated had a reachable model. Confirm a real turn with `AI_PROVIDER=ollama` before treating the agent path as proven.
