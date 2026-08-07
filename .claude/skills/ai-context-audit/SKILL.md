---
name: ai-context-audit
description: Verify against current code whether the FreshStart assistant is genuinely grounded and safe — retrieval actually reaching the response, timeline and conversation actually populated, guardrails unconditional, the model unable to author semantic or authorization facts, degradation honest in the UI, and a real-model path that is more than a mock. Read-only. Run before any claim that the assistant is "contextual", "RAG-backed" or "agentic", and before or after any change under backend/app/ai.
---

# AI context audit

## 1. Identity

**Skill name:** `ai-context-audit`
**Domain:** AI assistant / verification (read-only)

**Role.** You act as the auditor who does not take the assistant's description at face value — not
the documentation's, not a prior agent's, and not your own from an earlier session. You re-derive
each grounding and safety property from the code that is on disk right now, and you report PASS or
FAIL with `file:line` evidence.

## 2. Purpose

"Contextual AI" is the claim this project is most likely to make prematurely: a schema field named
`retrieved_documents` looks like retrieval, an index class that implements `search()` looks like RAG,
and a guardrail module looks like enforcement. Each of those has, at some point in this repository's
history, existed without being wired into the response path.

The audit exists to separate *implemented* from *reachable*, and to keep the safety properties of
ADR 0002 — deterministic floor, server-composed response, action allow-list, review flag that only
rises — from eroding one plausible refactor at a time.

## 3. Mission

Produce a PASS/FAIL verdict per check, each backed by a citation from the current tree, plus a clear
statement of which claims about the assistant are and are not currently supportable.

## 4. Activation conditions

### Use this skill when

- Before stating that the assistant is contextual, RAG-backed, agentic or grounded.
- Before and after any change under `backend/app/ai/`, `case_context_builder.py` or the guidance
  path.
- As part of `/release-readiness-gate`.
- When a demo answer looks suspiciously generic, or suspiciously authoritative.
- When a document or a previous session asserts a grounding capability you have not verified.

### Do NOT use this skill when

- You intend to change the assistant — audit first, then use `/ai-context-change`.
- The question is about UI rendering of the chat — `/visual-qa`.
- The question is about authorization in general rather than the AI path —
  `security-reviewer`.

## 5. System context

The response path this audit follows, in execution order:

```text
POST /api/v1/bankruptcy/guide            backend/app/api/routers/bankruptcy.py
  → CaseAccessService.authorize_for_submission        (ownership, server-side)
  → BankruptcyGuidanceService.guide                   backend/app/services/bankruptcy_service.py
       CaseDocumentIndex.search(...)                  retrieval
       AIConversationRepository.list_recent(...)      history in
       CaseContextBuilder.build(... timeline, recent_conversation, retrieved_documents)
       AgentRuntime.execute(context, message)         backend/app/ai/runtime.py
           1. RuleBasedProvider.generate → draft      (always, first)
           2. agent layer, if AI_PROVIDER ∈ {openai, ollama} and strands importable
           3. guardrails + action allow-list
           4. server-composed AssistantResponse (disclaimer, degraded, review flag)
       AIConversationRepository.add_turn(...) ×2      history out
  → frontend: ChatPanel.tsx, assistantActions.ts, useAiHealth.ts, ModernHeader badge
```

Baseline documents: `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` §4 describes the state
**as of that date** and several of its gaps have since been closed — treat it as history, and
re-derive everything below from code.

## 6. Source of truth

1. The code in this checkout.
2. Tests that actually execute the path (`test_agent_wiring_integration.py`,
   `test_ai_context_persistence.py`, `test_agent_security.py`).
3. ADR 0002 for what the architecture is supposed to guarantee.
4. Audit documents — history only, never proof of present state.

## 7. Ownership

**Owns:** the verdict and its evidence. Nothing on disk.

**Does not own:** any fix. Findings route to `/ai-context-change` or `ai-context-engineer`.

## 8. Boundaries

- Read-only: `Read`, `Grep`, `Glob`, and read-only test runs.
- No check is answered from memory or from a document.
- A grep is a *locator*, not a verdict — every hit is confirmed by reading the surrounding code, and
  every miss is confirmed by a second search with different terms before being called absent.

## 9. Invariants

```text
INVARIANT-01  Every check reports PASS or FAIL with file:line, or "no match found" with the exact
              search used.
INVARIANT-02  A field's existence on a DTO is never evidence that it is populated.
INVARIANT-03  A method's existence is never evidence that it is called on the response path.
INVARIANT-04  Checks 1 and 2 are blocking for any "contextual AI" claim.
INVARIANT-05  Safety checks (4, 7, 8) are blocking for any release claim.
INVARIANT-06  No file is modified.
```

## 10. Dependencies

The AI module layout, the guidance service, the document index, the conversation repository, the
frontend health/degraded surfaces. If any of these move, the searches below must be re-derived
rather than re-run verbatim.

## 11. Required knowledge

ADR 0001 and 0002; the difference between ingestion and retrieval; why `requires_attorney_review`
must be OR-combined; the Agents-as-Tools construction-time role gate; prompt injection; the
optional-extra deployment model.

## 12. Inputs

A claim to verify, a change to review, or a release gate asking for the AI section.

## 13. Preconditions

1. You are in the checkout whose state is being audited.
2. You have not already audited this exact tree in this session.

## 14. Discovery procedure — the checks

Run each check, read the surrounding code, and record evidence.

### Check 1 — Does retrieval actually reach the response? (blocking)

```
grep -n "CaseDocumentIndex\|_document_index\.search\|\.search(" \
  backend/app/services/bankruptcy_service.py backend/app/services/case_context_builder.py
```

Expected: a real call in the guidance path whose result is passed into
`CaseContextBuilder.build(..., retrieved_documents=...)`. Note that `CaseContextBuilder` deliberately
never calls the index itself — it shapes what the caller hands it, so evidence must come from the
**service**, not the builder. If the only hits are imports or type annotations, RAG is
ingestion-only.

### Check 2 — Are timeline and conversation populated, not just declared? (blocking)

```
grep -n "timeline\|recent_conversation\|retrieved_documents" backend/app/schemas/assistant.py
grep -n "timeline=\|recent_conversation=\|retrieved_documents=" \
  backend/app/services/case_context_builder.py backend/app/services/bankruptcy_service.py
grep -n "list_recent\|add_turn\|get_recent_timeline" backend/app/services/bankruptcy_service.py
```

Expected: fields on `CaseContextDto`, assigned in `build()`, and *fed* by real repository calls in
the guidance service. A `default_factory=list` field that nobody fills is an empty context wearing a
schema.

### Check 3 — Do guardrails run for every provider, unconditionally?

```
grep -n "guardrails\.review\|ResponseGuardrails" backend/app/ai/runtime.py \
  backend/app/services/bankruptcy_service.py
```

Expected: the call sits in `AgentRuntime._compose`, on the single path both the agent answer and the
deterministic draft flow through — so there is no provider-specific bypass. A guardrail invoked
inside one provider's branch is a finding.

### Check 4 — Can a model-backed path set facts rather than phrasing? (blocking)

```
grep -rn "requires_attorney_review" backend/app/ai/
grep -rn "handled_by\|structured_output" backend/app/ai/runtime.py
```

Expected: `requires_attorney_review` is OR-combined in `_compose`
(`draft.requires_attorney_review or guarded.requires_attorney_review`) and assigned nowhere else
from model output. Any plain assignment from an `AgentAnswer` field is a violation of the ADR 0002
contract. Note the provider layout: there is **no** `ollama_provider.py` — Ollama and OpenAI are
handled by `app/ai/model_factory.py` behind the agent runtime, and
`app/ai/providers/` holds only `base`, `factory`, `rule_based` and `transformers_provider`.

### Check 5 — Is the allow-list enforced on both sides?

```
grep -n "ALLOWED_ACTION_RESOURCES" backend/app/ai/contracts/assistant_response.py \
  backend/app/ai/runtime.py
grep -n "overview\|attorney-review" frontend/src/api/assistantActions.ts
```

Expected: server-side filtering in `_allowed_actions` (dropping, not coercing) and a matching
client-side list. A divergence means the UI renders or hides actions the backend did not intend.

### Check 6 — Is role redaction real?

```
grep -n "attorney_notes" backend/app/services/case_context_builder.py \
  backend/app/ai/tools/case_tools.py
grep -n "attorney_only" backend/app/ai/agents/factory.py
```

Expected: `attorney_notes=case.attorney_notes if role == "attorney" else None` in the builder; an
attorney-only specialist that is not constructed for a client runtime; and the tool re-checking
regardless.

### Check 7 — Is degradation honest end to end? (blocking for release)

```
grep -n "degraded" backend/app/ai/runtime.py frontend/src/types/bankruptcy.ts
grep -n "available" frontend/src/types/api.ts frontend/src/hooks/useAiHealth.ts \
  frontend/src/components/organisms/ModernHeader.tsx
grep -n "degradedAnswer\|serviceUnavailable" frontend/src/locales/es/ai.json frontend/src/locales/en/ai.json
```

Expected: `degraded=True` set on the fallback path; a typed `degraded` on the client response; an
`available` flag surfaced by the header badge; and both locales carrying the copy. A silent fallback
that renders identically to a live answer is a finding even though nothing crashes.

### Check 8 — Is the agent loop bounded and the optional import lazy?

```
grep -n "_MAX_AGENT_TURNS\|Limits(" backend/app/ai/runtime.py
grep -rn "^from strands\|^import strands" backend/app/
```

Expected: a turn cap passed to the orchestrator, and **no** module-scope `strands` import anywhere —
the import lives inside `_run_agents`.

### Check 9 — Is there any test against a real model, or only mocks?

```
grep -rln "monkeypatch\|MagicMock\|stub" backend/tests | grep -i "agent\|ai"
grep -rn "skipif\|SKIP_IF\|reachable\|live" backend/tests/test_agent_wiring_integration.py
```

Expected: mocks are legitimate for the safety properties, but at least one path should be able to
exercise a real endpoint gated by an env var / reachability probe that skips cleanly offline. If
every AI test mocks the transport, say so plainly: the safety contract is proven, the model
integration is not.

### Check 10 — Injection and cross-case isolation are pinned by tests

```
grep -n "def test_" backend/tests/test_agent_security.py
```

Expected: tests covering a cross-case access attempt, an attorney-only tool from a client runtime,
and an instruction embedded in document/user text failing to change actions or flags.

## 15. Decision framework

**A grep matches but the code is unreachable** (a helper nobody calls, a branch behind a flag that is
never set) → FAIL with the reason. Reachability is the property being audited.

**A grep finds nothing** → search again with different terms before concluding absence; the module
layout has changed before, and a stale search string produces a false FAIL.

**A test asserts the property** → strongest evidence. Cite the test name.

**A comment or docstring asserts the property** → weakest. It is intent, not behavior.

**The property holds only for one language** → FAIL. Guardrails were Spanish-only until 4.2.0 and
the English side had no eligibility guard at all; that class of gap is invisible to a single-locale
check.

**A gap is documented as deliberate** (shared conversation history between a client and their
attorney, attorney access approximated as "any existing case") → report it as a *known, documented
limitation* with its citation, not as a defect. Suppressing it is dishonest; calling it a bug is
inaccurate.

## 16. Execution workflow

```text
ORIENT      read runtime.py::execute and the guidance path once, end to end
RUN CHECKS  1 → 10, in order
CONFIRM     read the code around every hit; re-search every miss
CLASSIFY    PASS / FAIL / documented-limitation
VERDICT     what may be claimed, and what may not
ROUTE       findings → ai-context-change / security-reviewer / test-engineer
```

## 17. Proactive behavior

- **Local:** when one check fails, examine the neighbouring property — a missing guardrail call and
  an unfiltered action list tend to arrive together.
- **Horizontal:** every server-side list with a client mirror (`ALLOWED_ACTION_RESOURCES`) must be
  checked on both sides.
- **Vertical:** follow one real request from router to repository and back; a property that holds in
  three files and breaks in the fourth is only visible that way.
- **Pattern:** repeated "declared but unpopulated" findings mean the schema is being used as a plan;
  say so.
- **Regression risk:** name the test that would have caught each failing check. If none exists, that
  absence is itself a finding for `test-engineer`.

## 18. Expected agent behavior

Re-derive, never recall. Read around every hit. Distinguish absent from unreachable from unproven.
Cite `file:line`. State plainly which claims are supportable.

## 19. Forbidden behaviors

```text
DO NOT:
- modify any file;
- report a check PASS on the strength of a DTO field, a docstring or an audit document;
- copy a previous audit's verdict forward;
- summarize several failures into one "AI needs work";
- treat a mocked test as evidence of model integration;
- call a documented, deliberate limitation a defect;
- declare a check absent after a single grep with one spelling.
```

## 20. Error handling strategy

| Situation | Response |
|---|---|
| A referenced file does not exist | Re-derive the search from the current layout; report the layout change (e.g. `ollama_provider.py` no longer exists — Ollama lives in `model_factory.py`) |
| A grep is ambiguous | Read the file; ambiguity is not a verdict |
| Tests cannot be run | Audit statically and mark test-dependent checks "unverified", not PASS |
| A check does not apply to this configuration | Say so, with the configuration named (`AI_PROVIDER`, missing extra) |

## 21. Edge cases

- **`AI_PROVIDER=rule_based`** (the default deployment): the agent path never runs. Safety checks
  still apply — verify the degraded path produces a complete answer *with actions*
  (`_draft_as_answer`), not a bare message.
- **`strands` not installed:** an `ImportError` path that must degrade, not fail.
- **`OPENAI_BASE_URL` set:** a different protocol and a different token parameter; provider checks
  must account for both shapes.
- **Empty retrieval:** an honest empty context. The assistant must not invent sources — check the
  behavior, not just the plumbing.
- **Both locales:** run any message-level check for `es` and `en`.
- **Vercel deployment:** a trimmed dependency set; some paths simply do not exist there. State which
  target you audited.

## 22. Cross-system impact checklist

```text
[ ] Retrieval reaches the response (not just ingestion)
[ ] Timeline and conversation populated from real repositories
[ ] Guardrails unconditional, both languages
[ ] Model cannot set semantic or authorization facts
[ ] requires_attorney_review only rises
[ ] Action allow-list enforced server-side and mirrored client-side
[ ] Role redaction verified (context, tools, specialist construction)
[ ] Degradation visible and honest in the UI, in both locales
[ ] Agent loop bounded; strands imported lazily
[ ] Security tests exist for cross-case, role and injection
[ ] Real-model coverage present, or its absence stated
```

## 23. Validation strategy

Static reading is the core of this audit. Where the suite can run, add:

```bash
cd backend && uv run pytest tests/test_agent_runtime.py tests/test_agent_security.py \
  tests/test_agent_wiring_integration.py tests/test_ai_context_persistence.py \
  tests/test_case_context_builder.py tests/test_guardrails.py
```

A green run turns several checks from "the code appears to do this" into "this is enforced". Say
which checks the tests actually covered rather than implying they covered all of them.

## 24. Definition of Done

```text
[ ] All ten checks executed against the current tree
[ ] Every result cites file:line, or the exact search that found nothing
[ ] Hits confirmed by reading, misses confirmed by a second search
[ ] Documented limitations distinguished from defects
[ ] Blocking checks (1, 2, 4, 7) called out explicitly
[ ] Findings routed to an owner
[ ] Verdict states what may and may not be claimed
```

## 25. Expected output

```markdown
## AI context audit — <branch> @ <HEAD>

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Retrieval reaches the response | PASS | bankruptcy_service.py:403 → build(retrieved_documents=…) |
| 2 | Timeline + conversation populated | PASS | case_context_builder.py:62-74; bankruptcy_service.py:412 |
| … | | | |

### Blocking
<none | check N because …>

### Documented limitations (not defects)
- Conversation history is case-scoped, not role-scoped — protocols.py:70-87

### Claims supportable today
- …

### Claims NOT supportable today
- …

### Routed findings
| Finding | Owner |
```

## 26. Escalation rules

Escalate immediately, before finishing the remaining checks, when: a client can reach attorney-only
material; a model-authored value can lower `requires_attorney_review` or set an authorization fact;
retrieval is not case-scoped; or a model failure produces an error response instead of a degraded
answer. Those are live safety defects, not audit findings to file.

## 27. Collaboration with other skills

```text
ai-context-audit
 ├── precedes  → ai-context-change (know the real state before changing it)
 ├── feeds     → release-readiness-gate (the AI section of the verdict)
 ├── routes to → security-reviewer for isolation/injection defects
 ├── routes to → test-engineer for missing coverage
 └── complements → design-system-audit (same evidence discipline, UI surface)
```

## 28. Examples

**Correct.** Check 1: the grep hits `bankruptcy_service.py:403`; you read the surrounding block,
confirm the call is scoped to the authorized `case_id` and that its result is passed into
`CaseContextBuilder.build(..., retrieved_documents=...)`, and you record
`PASS — bankruptcy_service.py:403, consumed at the build call`. Retrieval is reachable, not merely
implemented.

**Incorrect.** Reading `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` §4 — which says
`CaseDocumentIndex.search()` is never called — and reporting FAIL. That was accurate when written
and is not now; audits are history.

**Complex.** Check 4 on a branch that added a "confidence" field to `AgentAnswer` and used it to
skip the review caveat when the model is confident. Every test passes, because none of them asserts
the negative. The audit's job is to notice that a model-authored value now influences
`requires_attorney_review`, cite the line, mark it blocking against ADR 0002, and escalate — a
correct-looking feature that inverts a safety contract.

## 29. Failure scenarios

```text
Scenario: A previous session reported "RAG is ingestion-only".
Wrong:    Repeat it.
Correct:  Re-run check 1. The call exists today at bankruptcy_service.py:403. Report PASS and note
          that the stale claim is still in an audit document, so it keeps propagating.

Scenario: grep for ollama_provider.py returns nothing.
Wrong:    Report "the Ollama provider is missing".
Correct:  The layout changed with ADR 0002. Ollama is a model behind AgentRuntime
          (model_factory.py:118), not a provider in providers/. Re-derive the search and audit the
          real path.

Scenario: The chat renders an answer while the model is down.
Wrong:    PASS, because the app did not crash.
Correct:  Check 7 asks whether the user can tell. Verify degraded=True reaches the client type, that
          the header badge reflects `available: false`, and that ai.json in BOTH locales has the
          copy. A fallback indistinguishable from a live answer is the finding.
```

## 30. Self-review

1. Did I re-derive every check from the current tree?
2. Did I read the code around each hit rather than trusting the match?
3. Did I search twice before declaring anything absent?
4. Did I check both languages wherever a message is involved?
5. Did I check both sides of every mirrored list?
6. Did I separate documented limitations from defects?
7. Did I state which checks the tests actually covered?
8. Is my verdict specific about what may and may not be claimed?
9. Did anything I found need escalating rather than filing?
