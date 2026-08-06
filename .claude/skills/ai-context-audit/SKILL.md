---
name: ai-context-audit
description: Verifies whether the FreshStart AI assistant is actually contextual — checks that RAG retrieval is wired into the guidance flow, that timeline/conversation history exist in the context envelope, that guardrails run unconditionally, and that Ollama-dependent code degrades safely. Use before claiming the assistant is "contextual" or "RAG-backed", or before any change to backend/app/ai or backend/app/services/case_context_builder.py.
---

# AI context audit

Ground truth baseline is `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` §4. Re-verify each
item below against current code — do not assume it's still accurate.

## 1. Is RAG actually wired into the response flow?
```
grep -n "CaseDocumentIndex\|\.search(" backend/app/services/bankruptcy_service.py backend/app/services/case_context_builder.py
```
If neither file references `CaseDocumentIndex` or calls `.search(...)`, retrieved documents never
reach the assistant — RAG is ingestion-only, not active. This must show a real call before claiming
"RAG-backed."

## 2. Does the context envelope include timeline and conversation history?
```
grep -n "timeline\|messages\|conversation" backend/app/schemas/assistant.py
```
Confirm the fields exist AND are populated in `CaseContextBuilder.build()`, not just declared on the
DTO — check the builder function body, not only the schema.

## 3. Do guardrails run unconditionally for every provider?
```
grep -n "guardrails\.review\|ResponseGuardrails" backend/app/services/bankruptcy_service.py
```
Confirm the call sits after `self._provider.generate(...)` for ALL providers (rule_based, ollama,
transformers) with no provider-specific bypass branch.

## 4. Does a model-backed provider ever set facts, not just phrasing?
```
grep -n "draft\.\(intent\|suggested_actions\|focus_section\|requires_attorney_review\) *=" backend/app/ai/providers/ollama_provider.py backend/app/ai/providers/transformers_provider.py
```
Any match is a violation of the safety contract — these fields must stay rule-based-derived. Zero
matches expected.

## 5. Is Ollama ever tested against a real reachable instance?
```
grep -rln "monkeypatch.*urlopen\|urlopen.*monkeypatch" backend/tests
```
If every Ollama-related test mocks `urlopen`, there is no real-model test. A real test should exist
gated by an env var / reachability check that skips cleanly offline (e.g. `pytest.mark.skipif` on a
health probe), not another mock.

## 6. Does degraded/offline state reach the UI honestly?
```
grep -n "available" frontend/src/hooks/useAiHealth.ts frontend/src/components/organisms/ChatPanel.tsx
```
Confirm the UI branches on `available: false` with a visible message, not a silent fallback that
looks identical to the connected state.

## Output format
For each of the 6 checks: PASS/FAIL + evidence (file:line or "no match found"). A "contextual AI"
claim requires checks 1 and 2 to PASS — everything else can be a lesser finding, but 1 and 2 are
blockers.
