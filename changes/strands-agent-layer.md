---
taskId: strands-agent-layer
type: major
scope: backend-ai, assistant-contract, agent-governance
---
# Summary
Replace the rewrite-only `OllamaProvider` with a Strands Agents orchestration layer: an orchestrator delegating to five role-gated specialists (Agents-as-Tools), read-only tools bound to one authorized case, prompts versioned per locale, and a server-composed response. See [ADR 0002](../docs/decisions/0002-strands-agent-orchestration.md).

Also fixes the governance tooling, which could not express parallel worktrees despite rule `01-git-delivery` mandating them.

# User-visible behavior
With `AI_PROVIDER=rule_based` (the default, and every current deployment) behavior is unchanged apart from the response shape: the assistant answers deterministically and now reports `degraded: true` so the UI can say the answer did not come from a model. With `ollama` or `openai` configured, the assistant can look case data up through tools before answering instead of only rephrasing a fixed draft.

The chat renders structured cards, and assistant actions are validated against a section allow-list on both sides of the wire before anything is rendered or navigated to.

# Migration / compatibility
**Breaking.** `AssistantResponse` changes from `message/intent/suggested_actions/focus_section/requested_fields/requested_documents/summary_updates/confidence/disclaimer` to `language/message/handled_by/actions/cards/warnings/requires_attorney_review/degraded/disclaimer`. The frontend consumer, its types and its tests are updated in this delivery; no other client exists.

`focus_section` is gone as a field and becomes an `open_page` action, preserving the "open the recommended section" affordance.

Config: `OLLAMA_TIMEOUT_MS` removed (the SDK owns transport); `AI_TEMPERATURE`, `AI_MAX_OUTPUT_TOKENS` and `OPENAI_API_KEY` added. `OLLAMA_EMBEDDING_MODEL` is untouched — it belongs to RAG, not to `AI_PROVIDER`.

Version files are deliberately untouched: this is a parallel worktree, so integration-manager consolidates fragments and performs the single MAJOR bump.

# Tests and evidence
- Backend: 133 tests, `ruff` and `mypy` clean, against a venv synced from `pyproject` with the `agents` extra.
- `test_agent_wiring_integration.py` exercises the real SDK — real `strands.Agent` construction, real tool specs generated from docstrings and type hints, real `as_tool()` delegation, real role gating.
- `test_agent_security.py` pins case binding (no tool accepts a `case_id`/`role`, asserted both on Python signatures and on the JSON schema handed to the model), cross-case document isolation, attorney-only tool refusal, and the read-only tool surface.
- Real end-to-end HTTP against a running server: login, ownership, persistence, contract serialization, 403 on role mismatch, 401 unauthenticated.
- Frontend: 47 tests (10 new, covering the action allow-list), lint (0 errors), i18n parity, production build.

# Risks / limitations
**No live LLM has run through this layer.** No Ollama daemon was reachable and no `OPENAI_API_KEY` was present. Everything up to the SDK's tool surface is exercised; the model call itself is not. Confirm a real turn with `AI_PROVIDER=ollama` before treating the agent path as proven.

`AI_PROVIDER=openai` sends reduced case context (income, debts, and for an attorney session the private notes) to a third party. It is opt-in and off by default; a deployment enabling it is making a data-egress decision.

Write actions are not implemented — phase 1 is read-only. `requires_confirmation` is carried in the contract so the signed-confirmation flow can be added without another breaking change.

Latency and cost rise when an agent provider is configured; `Limits(turns=8)` bounds both.

# Governance tooling
`scripts/agent/common.mjs` and both `.claude/hooks` resolved every path against the primary worktree and shared one `active-task.json`. Two consequences, both hit during this delivery: a file inside a linked worktree resolved to `../Glade-Demo-<task>/…`, matched no ownership glob and was always denied; and registering a task in any worktree silently replaced every other worktree's manifest. Paths now resolve against the checkout the file lives in, and each checkout owns its manifest under `claude-state/active/<worktree>.json`, with the legacy single-file location still read for in-flight tasks.
