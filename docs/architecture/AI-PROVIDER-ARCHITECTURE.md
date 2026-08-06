# AI Provider Architecture

Living document for Block 8 of `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md`. Updated in Block 9 when `CaseContextBuilder` and the structured `AssistantResponse` land.

## Why a provider abstraction

Per master instruction §7.1: the application must not depend directly on a specific model. `backend/app/services/bankruptcy_service.py` (`BankruptcyGuidanceService`) depends only on the `BaseAIProvider` Protocol (`backend/app/ai/providers/base.py`), never on a concrete provider — the same pattern AGENTS.md already requires for repositories/unit-of-work.

## The providers

| Provider | File | When used | Network/model dependency |
|---|---|---|---|
| `RuleBasedProvider` | `rule_based.py` | Default (`AI_PROVIDER` unset or `rule_based`) | None — pure Python, always available |
| `OllamaProvider` | `ollama_provider.py` | `AI_PROVIDER=ollama` | Local/Docker/VPS Ollama instance at `OLLAMA_BASE_URL` |
| `TransformersProvider` | `transformers_provider.py` | `AI_PROVIDER=transformers` | Local `torch`/`transformers` (optional `ai` dependency group) |

Selected by `backend/app/ai/providers/factory.py:get_provider_for_settings`, driven entirely by env vars — no model id is ever hardcoded in application code beyond the `Settings` defaults, which are themselves overridable.

## Design decision: facts stay rule-based, models only rewrite phrasing

`OllamaProvider` and `TransformersProvider` do **not** independently decide what to say. Each wraps an internal `RuleBasedProvider`, asks it for the deterministic `GuidanceDraft` (message, intent, suggested actions, focus section, warnings, etc. — all derived from the actual case analysis), and only ever attempts to rewrite the `message` field's phrasing through the model. If the rewrite fails for any reason, the untouched deterministic draft is returned.

This was a deliberate choice, not a limitation carried over accidentally:

- It guarantees the guardrail principle in master instruction §7.7 ("nunca inventar requisitos", "no afirmar elegibilidad") structurally — a model that only rewrites wording cannot introduce a new fact, action, or eligibility claim, because it never sees or controls those fields.
- It means "Ollama is down" or "transformers failed to load" degrades to *identical functional behavior* to the rule-based provider, just with the original (already carefully written) Spanish copy instead of a model rewrite — never a broken or empty response.
- It matches the pre-existing pattern in this codebase (the former `TextGenerator.compose()` did the same rewrite-only rewrite against a deterministic fallback) — this is a refactor of an established, working safety pattern into a proper provider abstraction, not a new experiment.

## Failure handling

Both `OllamaProvider` and `TransformersProvider` catch every exception their respective call sites can realistically raise (`URLError`/`TimeoutError`/`OSError`/JSON errors for Ollama; `ImportError`/`ModuleNotFoundError`/`RuntimeError`/`ValueError`/`OSError` for transformers) and log a warning before returning the untouched draft — the audit flagged the pre-refactor code for **silently** swallowing these; the replacement always logs. Neither provider can raise into `BankruptcyGuidanceService.guide()` — this is exercised in `backend/tests/test_ai_providers.py` with the network/import calls monkeypatched to fail, so the test suite never makes a real network or model call.

`OllamaProvider.is_available()` is a lightweight `GET {OLLAMA_BASE_URL}/api/tags` used for logging/diagnostics only — it is never a precondition for `generate()`, which has its own independent timeout and fallback.

## Why `urllib` instead of an HTTP client dependency

`OllamaProvider` uses Python's standard-library `urllib.request` rather than adding `httpx` (or similar) as a runtime dependency. Ollama only ever runs in local/Docker/VPS environments — never on the trimmed Vercel serverless function — so there was no need to grow the dependency surface everywhere just to support a code path most deployments never execute. If a production deployment later wants connection pooling/retries/async, swapping the two private methods in `ollama_provider.py` for an `httpx.Client` is a contained change.

## Configuration (`backend/app/core/config.py`, `.env.example`)

```env
AI_PROVIDER=rule_based        # rule_based | ollama | transformers
AI_MODEL_ID=Qwen/Qwen3-0.6B    # transformers only
AI_MAX_NEW_TOKENS=180          # transformers only
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text   # reserved for Block 10 (RAG embeddings)
```

`AI_PROVIDER` defaults to `rule_based` everywhere, including the Vercel deployment — Ollama and transformers are opt-in for local/Docker/VPS use.

## Status update (Block 9 / Block 10)

Block 9 landed exactly as described above: `BaseAIProvider.generate()` now takes a `CaseContextDto` (built by `CaseContextBuilder`) instead of the raw request/analysis, and `BankruptcyGuidanceService` returns the full `AssistantResponse`/`AssistantAction` contract. See `CASE-CONTEXT-ARCHITECTURE.md`.

Block 10 added `ResponseGuardrails` (`backend/app/ai/guardrails.py`), which runs on every provider's output — rule-based or model-rewritten — inside `BankruptcyGuidanceService.guide()`, softening eligibility/chapter-preference/definitive-advice phrasing and forcing `requires_attorney_review=True` when triggered. See `DOCUMENT-AND-RAG-PIPELINE.md` for the guardrails and document-pipeline details.
