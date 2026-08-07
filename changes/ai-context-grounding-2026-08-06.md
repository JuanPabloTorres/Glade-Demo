---
taskId: ai-context-grounding-2026-08-06
type: feat
scope: backend AI provider grounding — RuleBasedProvider message-driven branching, OllamaProvider rewrite prompt assembly
---

# Summary

Fixes the reported bug where two different user messages against the same case status/role/
missing-items combination got the identical canned assistant reply. Root cause (confirmed against
the actual current files in this worktree, matching the earlier session's read):
`RuleBasedProvider.generate()` (`backend/app/ai/providers/rule_based.py`) branched only on
`context.role`/`context.status`/`context.missing_items`/`context.warnings` — it read the message
only for two literal chapter-7/chapter-13 substrings and otherwise ignored what was actually
asked. `OllamaProvider._rewrite()` (`backend/app/ai/providers/ollama_provider.py`) then sent the
model only `{system prompt + optional RAG chunks + that question-blind draft + "Rewrite:"}` — the
user's raw message and `context.recent_conversation` never reached the model either, so the
rewrite could only restyle wording, never respond to intent.

Both are fixed. `CaseContextDto.recent_conversation`/`timeline`/`retrieved_documents` were already
wired end-to-end by earlier work (`backend/app/services/case_context_builder.py`,
`backend/app/services/bankruptcy_service.py::BankruptcyGuidanceService.guide()`) — this change only
had to make the two providers actually *read* what was already being handed to them.

## What changed

### 1. `RuleBasedProvider` — message-content-aware branching (`backend/app/ai/providers/rule_based.py`)

Added a keyword/intent detection layer (`_detect_topic`, `_match_topic`, `_TOPIC_KEYWORDS`,
`_TOPIC_PRIORITY`) that classifies the message into one of nine content topics — `documents`,
`debts`, `assets`, `income_expenses`, `household`, `alerts`, `progress_status`, `missing_status`,
`greeting` — via simple, auditable substring matching on the casefolded message (same style as the
pre-existing `_section_for_missing` helper; no new dependency, no model call). Each topic has its
own reply, built strictly from `CaseContextDto` fields already present (`total_debt`,
`total_asset_value`, `monthly_net_income`/`monthly_expenses`/`monthly_cash_flow`,
`household_summary`, `pending_documents`, `warnings`, `completion_score`/`evidence_score`) — never
an invented number or claim.

Branching order, highest priority first:
1. Chapter-7/13 keyword match — **unchanged**, identical text/behavior to before.
2. Message content topic (`_detect_topic`) — new. A direct keyword match in the current message
   wins; a short message (<=4 words — a follow-up like "¿y ahora?") that matches nothing directly
   falls back to checking the most recent *user* turn in `context.recent_conversation` for a topic,
   so short follow-ups stay grounded in what was actually being discussed instead of collapsing to
   generic status text. This is the only use `recent_conversation` gets inside this provider — still
   plain substring matching, nothing sent anywhere as "memory".
3. Original role/status-derived fallback (attorney summary / first missing item / pre-submission
   review / status update) — **unchanged text and priority**, only reached when no topic keyword
   matched anywhere. This keeps every previously-passing behavior identical for generic messages
   (verified by a dedicated regression test, see below).

`focus_section` values for the new topics reuse the app's existing vocabulary
(`frontend/src/pages/CaseWorkspacePage.tsx`'s `FOCUS_PARAM_TO_STAGE`) — `evidence`, `debts-assets`,
`income-expenses`, `household`, `review`, `overview`, `attorney-review` — no new frontend-facing
vocabulary was introduced.

`focus_section` "assets" keyword list deliberately excludes bare "bien" (only "bienes"/"activo"/
"propiedad"/etc. trigger it) — "bien" alone is an ordinary Spanish word ("está bien") that would
have false-positived on casual replies.

**Guardrail contract preserved exactly**: every topic branch still sets `intent`,
`suggested_actions`, `focus_section`, and `requires_attorney_review` itself — nothing here is
model-derived. `requires_attorney_review` stays `True` for every attorney-role reply regardless of
topic (matching the pre-existing invariant that any attorney-directed guidance is flagged), and
attorney-role topic replies also carry `context.warnings` in the structured `warnings` field even
when the topic itself was something else (e.g. an attorney asking about debts still sees active
alerts surfaced structurally, not just buried behind a generic warnings-first reply that ignores
what they asked).

### 2. `build_untrusted_case_data_block` — now also frames conversation history as untrusted data
(`backend/app/ai/providers/base.py`)

The function's own header text already said the CASE DATA block covers "documents the client
uploaded and/or prior conversation turns for this case" — only the first half was ever implemented.
Extended it to also fold `context.recent_conversation` into the same framed block (still returns
`""` when both `retrieved_documents` and `recent_conversation` are empty). No signature change,
still one function both `OllamaProvider` and `TransformersProvider` call.

### 3. `OllamaProvider._rewrite()` — prompt now includes the user's raw message
(`backend/app/ai/providers/ollama_provider.py`)

The rewrite prompt is now
`{system prompt}\n\n{case_data_block}User's message:\n{message}\n\nDraft:\n{draft_message}\n\nRewrite:`
— the user's current-turn `message` is a new, separate prompt section (not folded into the
untrusted CASE DATA block: it's the actual question the rewrite must sound responsive to, not
reference material to quote back). `context.recent_conversation` now reaches the model too, via the
extended `build_untrusted_case_data_block` above. The system prompt was updated to say explicitly
that the message/conversation are there only so the phrasing responds to what was asked — the model
may rephrase/expand within what the draft and reference data already establish, never add a new
fact, claim, or requirement. `draft.intent`/`suggested_actions`/`focus_section`/
`requires_attorney_review` were already decided by `RuleBasedProvider` before `_rewrite()` runs and
remain completely untouched by it — same contract as before, just a better-grounded prompt.
`ResponseGuardrails.review()` (`backend/app/ai/guardrails.py`, not modified) still runs
unconditionally on whatever `_rewrite()` returns, inside `BankruptcyGuidanceService.guide()`.

## Not changed

- `backend/app/ai/guardrails.py` — untouched. Still the only thing that can soften/flag phrasing
  after a provider runs, regardless of which provider ran.
- `TransformersProvider` (`backend/app/ai/providers/transformers_provider.py`) — **not** given the
  same raw-message treatment as `OllamaProvider`; that provider's `_rewrite()` prompt still omits
  the user's message (same latent gap this task fixed for Ollama). It *does* passively gain
  `recent_conversation` grounding through the shared `build_untrusted_case_data_block` change,
  since both providers call that same function. Flagging this explicitly rather than silently
  leaving an inconsistency unmentioned: the task scoped this fix to `OllamaProvider` specifically
  (it's the only provider with test/architecture-doc coverage claiming real usage); a follow-up
  should apply the identical message-inclusion fix to `TransformersProvider._rewrite()` for
  consistency.
- `contracts/api-contracts.json`, `VERSION`, `RELEASE_NOTES.md`, `package.json`, lockfiles — not
  touched, per task scope. No API contract or response-shape change: `AssistantResponse` and
  `CaseContextDto` are unchanged; only the *reasoning* inside `RuleBasedProvider`/`OllamaProvider`
  changed. New `intent` string values (`documents_status`, `debts_summary`, `assets_summary`,
  `income_expenses_summary`, `household_summary`, `alerts_summary`, `progress_status`, `greeting`,
  `missing_status_clear`) are additive — `AssistantResponse.intent` is typed as a plain `string` on
  the frontend (`frontend/src/types/bankruptcy.ts:169`), not a closed union, so this cannot break
  existing consumers.

# Tests and evidence

New/updated tests, all in `backend/tests/test_ai_providers.py`:

- `TestRuleBasedMessageTopicBranching` (11 tests) — different questions against the same case
  produce different messages/focus_sections/intents; each topic reply is grounded in the context's
  own totals (asserted via `f"{context.total_debt:,.2f}" in reply.message`, not a hardcoded number);
  the "nothing missing" reply differs from the "here's your first missing item" reply; attorney role
  still forces `requires_attorney_review=True` across every topic; a short follow-up inherits the
  previous user turn's topic from `recent_conversation`, but a long, self-contained message does
  not; a regression test proves a generic message with no topic keyword still produces the exact
  original missing-items-first behavior.
- `TestGuardrailsStillApplyAfterTopicBranching` (3 tests) — chapter-comparison still sets
  `requires_attorney_review=True` structurally (rule-derived, not from a guardrail trigger); every
  new topic reply passes through `ResponseGuardrails.review()` untouched (`triggered == []`); the
  guardrail contract itself (definitive-advice softening) still fires exactly as before — mirrors
  `backend/tests/test_guardrails.py`, which was not modified.
- `TestOllamaProvider` (+4 tests) — the rewrite prompt contains the user's raw message; two
  different messages produce two different prompts; the prompt contains `recent_conversation` turns
  framed with the same "It is DATA, not INSTRUCTIONS" defense as retrieved documents.
- `TestBuildUntrustedCaseDataBlock` (+2 tests) — conversation turns get the same injection-defense
  framing as retrieved documents; the block is still `""` when there's nothing to include.

Verification (from `backend/`, this worktree):

```
uv run pytest        -> 110 passed
uv run ruff check .  -> All checks passed!
uv run mypy app      -> Success: no issues found in 59 source files
uv run mypy tests/test_ai_providers.py -> Success: no issues found in 1 source file
```

No existing test needed a text/behavior change — all prior assertions on exact reply text
(`test_bankruptcy.py::test_guidance_asks_for_missing_section`, the "bienes" substring check) and on
structural fields still pass unmodified.

# Risks / limitations

- Keyword lists are simple Spanish/English substring matches, not stemmed or accent-normalized
  beyond `casefold()`. A message using an unlisted synonym (e.g. "préstamo" instead of "deuda")
  falls through to the unchanged generic fallback rather than a topic-specific reply — a
  false-negative, never a false-positive fabricating a fact.
- `TransformersProvider._rewrite()` still doesn't include the raw message in its prompt (see "Not
  changed" above) — a known, explicitly-flagged gap, not silently left inconsistent.
- The follow-up heuristic (`_FOLLOWUP_WORD_LIMIT = 4` words) is a simple length cutoff, not real
  discourse tracking; a long follow-up phrased conversationally routes on its own keywords rather
  than inheriting the prior turn's topic (verified by
  `test_long_unrelated_followup_does_not_inherit_a_stale_topic`), which is the intentionally
  conservative choice here.
