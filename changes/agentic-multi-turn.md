---
taskId: agentic-multi-turn
type: fix
scope: agent prompt continuity across turns
---
# Summary

The agentic path never saw the conversation it was part of. `AgentRuntime._build_prompt`
sent language, role and the current message; `recent_conversation` stopped at
`CaseContextDto` and was read only by the deterministic providers
(`providers/base.py`, `rule_based._detect_topic`). So on the agentic path a follow-up
like *"¿Y cuánto pago al mes?"* had no antecedent for "y", and *"Why the first one?"*
had no first one.

A follow-up question is a named step in both release journeys, which makes this a
defect rather than a missing enhancement — the demo's second question was the one that
did not work.

# What changed

`_build_prompt` now includes an `EARLIER TURNS` block when the case has history.
Nothing else moved: case facts still arrive through tools, and the block is omitted
entirely on a first turn rather than emitted empty.

The turns are framed as data, not instructions, next to the data itself — the same
defense `build_untrusted_case_data_block` applies for the rewrite providers. A separate
block was written rather than reusing that function because it also folds in
`retrieved_documents` (the search tool's job here) and its header ends "when rephrasing
the draft below", which is false in an agent prompt.

This adds no injection surface. The user's current message is already free text in the
same prompt; these are earlier messages from the same person, capped at six turns by
`_CONVERSATION_CONTEXT_LIMIT`. The assistant half is the *guarded* message, because
that is what `BankruptcyGuidanceService.guide` persists — a later turn cannot read back
a phrasing the guardrails removed.

# Tests and evidence

`tests/test_agentic_multi_turn.py` — the four conversations the release contract names,
each two turns, through real HTTP with only the provider faked:

| Conversation | Turn 1 → 2 | Route proved |
|---|---|---|
| Client ES | ¿Cuánto debo? → ¿Y cuánto pago al mes? | `analysis_agent` → `get_financial_snapshot` |
| Client EN | What am I missing? → Which items need evidence? | `case_agent` → `documents_agent` |
| Attorney portfolio | Which cases need attention? → Why the first one? | `portfolio_agent` → `list_cases_needing_attention` |
| Attorney case | Resume este caso. → ¿Qué le falta? | `case_agent`, two different tools |

Each asserts `degraded=false`, the language of the request, the specialist actually
invoked, and that turn two's prompt contains turn one's question **and** answer.

Three tests exist to stop the other four from passing vacuously: a first turn carries no
`EARLIER TURNS` block at all; two turns on the same case in English stay English rather
than inheriting an earlier Spanish session; and an attorney moving from Miguel's case to
Elena's does not carry Miguel's transcript — which quotes his figures — into the new
prompt.

Removing the one-line change makes exactly the four continuity tests fail and leaves the
three negative tests passing. Verified, not assumed.

Backend: 340 passed, ruff clean, mypy clean on 71 files.

# Risks / limitations

**Continuity is keyed by case, not by role.** Two attorneys reviewing the same case share
one transcript, and a client sees turns an attorney typed on their case. The isolation
that exists is per case; `AIConversationRepositoryProtocol`'s docstring already records
role-scoping as an open gap and this change does not close it. It is not a release
blocker for a demo with one client and one attorney, but it is real.

**The topic-switch instruction is prompt text, not an assertion.** The block tells the
model to answer a new subject rather than the earlier one. A fake provider chooses tools
from a scripted list, so it cannot demonstrate that a real model obeys it — that belongs
to the live-provider gate, not here. Claiming a test for it would be claiming the fake
proved something it structurally cannot.
