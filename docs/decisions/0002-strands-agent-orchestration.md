# ADR 0002: Strands Agents orchestration replaces the Ollama rewrite provider

## Status
Accepted — 2026-08-06. Supersedes the model-provider half of [ADR 0001](0001-deterministic-provider.md); the deterministic default it establishes still holds.

## Context

Until 3.1.0 the assistant had one invariant: **the model could only rephrase `draft.message`.** `RuleBasedProvider` decided every semantic field (intent, suggested actions, focus section, attorney-review verdict) and `OllamaProvider`/`TransformersProvider` wrapped it, sending the draft through a model and replacing only the prose. If the model failed, the untouched draft was returned.

That made the fallback genuinely equivalent, but it also capped what the assistant could do: it could never answer a question the rule engine had not anticipated, never look something up, never assemble a figure on request.

The adopted direction is an agent layer that can decide *what to fetch* before it answers. That inverts the old invariant, so the decision is about what replaces it.

## Forces

- **Product boundary is non-negotiable.** FreshStart organizes information and prepares questions. It must never determine eligibility, select a chapter, or issue legal advice (AGENTS.md).
- **Case isolation is server-verified.** `CaseAccessService` established that a client-claimed `owner_user_id` is never trusted. An agent layer must not reintroduce a model-authored string on the authorization path.
- **The assistant must always answer.** A model outage cannot become a 5xx.
- **Deployment is heterogeneous.** The Vercel function runs a trimmed dependency set; local/VPS deployments can run a model. Both must boot.

## Options considered

1. **Keep the rewrite-only architecture, add Strands as a fourth provider.** Lowest risk, real but modest gain (validated structured output instead of raw text parsing). Rejected: does not deliver the requested capability.
2. **Full Agents-as-Tools orchestration, model owns the response.** Matches the adopted plan most literally. Rejected as specified: a model that emits the whole response also emits `requires_attorney_review` and the disclaimer.
3. **Agents-as-Tools with a server-composed response and a deterministic floor.** Chosen.

## Decision

Adopt `strands-agents` with the Agents-as-Tools pattern, under four constraints that keep the product boundary intact.

**1. The model's output surface is narrowed.** Two models, not one:

- `AgentAnswer` — what a model may produce: `message`, `handled_by`, `actions`, `cards`.
- `AssistantResponse` — what the server returns. `AgentRuntime` composes it, adding the mandatory disclaimer and computing `requires_attorney_review` as the OR of the deterministic draft's verdict and the guardrail verdict. **A model cannot lower it and cannot author the disclaimer.**

**2. Authorization is structural, not validated.** No tool accepts a `case_id`, `role`, or any other authorization parameter. `CaseTools` closes over the already-authorized `CaseContextDto`. This departs from the adopted plan, which passed a tenant id into each tool for the service to re-check — binding at construction removes the class of bug instead of defending against it. Two tests pin this: one on Python signatures, one on the JSON schema the SDK actually hands the model.

**3. The deterministic draft runs on every request.** Not only on failure. It is both the fallback and the source of the attorney-review baseline. Any failure in the agent path — extra not installed, missing credentials, timeout, invalid structured output, unexpected exception — degrades to it, and the response says so via `degraded: true` rather than passing a rule-based draft off as a model answer.

**4. Role gating happens at construction.** A client runtime is built without an attorney specialist, so no prompt wording can route to attorney-only tools. The tool re-checks the role anyway, so a wiring mistake fails loudly instead of disclosing quietly.

### Deliberately not adopted

- **OpenAI as the sole provider.** `ModelFactory` supports `openai` and `ollama`; `AI_PROVIDER` stays `rule_based` by default. `openai` sends reduced case context off-host and is opt-in per deployment.
- **Write tools.** Phase 1 is read-only. The action vocabulary carries `requires_confirmation` so the signed-confirmation flow can be added without another breaking change.
- **`strands-agents-tools`.** The SDK's prebuilt catalogue (shell, file I/O, Slack, AWS) pulls slack-bolt/boto3/sympy/watchdog. A generic shell tool catalogue is precisely what must never reach these agents.
- **Multi-tenancy.** The isolation unit here is the case, not a tenant.

## Consequences

- **Breaking API change.** `AssistantResponse` replaces `message/intent/suggested_actions/focus_section` with `language/message/handled_by/actions/cards/degraded`. The frontend consumer, its types and its tests are updated in the same delivery. MAJOR bump, owned by integration-manager.
- `focus_section` no longer exists as a field; it becomes an `open_page` action so the "open the recommended section" affordance survives on the deterministic path.
- The action allow-list is enforced twice — `AgentRuntime._allowed_actions` and `frontend/src/api/assistantActions.ts` — so neither side is the only guard between a model-authored string and a navigation target.
- Latency and cost rise when an agent provider is configured; `Limits(turns=8)` bounds both, and the loop.
- `strands` is an optional extra. An install without it is a supported configuration that answers deterministically, not a broken one.

## Validation

- 133 backend tests, ruff and mypy clean against a venv synced from `pyproject`.
- `test_agent_wiring_integration.py` builds the real orchestrator: real `strands.Agent` objects, real tool specs generated from docstrings and type hints, real `as_tool()` delegation, real role gating.
- Real end-to-end HTTP against a running server: auth, ownership, persistence, contract serialization, deterministic fallback, 403 on role mismatch, 401 unauthenticated.
- 47 frontend tests (10 of them new, covering the action allow-list), lint, i18n parity and production build.

**Not validated: a live LLM.** No Ollama daemon was reachable and no `OPENAI_API_KEY` was present in this environment. Everything up to and including the SDK's tool surface is exercised; the model call itself is not. First deployment with `AI_PROVIDER=ollama` should confirm a real turn end-to-end before the agent path is considered proven.

## Rollback

Set `AI_PROVIDER=rule_based`. The agent layer is skipped entirely and every response is the deterministic draft — the 3.1.0 behavior minus the model rephrase. No data migration, no schema change. To roll back the wire contract as well, revert this delivery's commit; nothing persisted depends on the new shape.
