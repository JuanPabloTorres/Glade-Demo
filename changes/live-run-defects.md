---
taskId: live-run-defects
type: minor
scope: assistant contract, guardrails, generated analysis copy, typing
---

# Summary

Fixes the three defects the 4.0.0 live agent run recorded and left open
(`changes/chat-modal-centered.md` §"Defects the live run exposed"), and clears
the six pre-existing `mypy` errors 4.2.0 shipped with. Two of the three turned
out to be narrower symptoms of wider gaps, and both wider gaps are fixed here
rather than papered over at the reported spot.

# What changed

**1. `handled_by` can no longer come back blank.** Turn 6 answered from the
agent path with `handled_by: ""`. The field has a default, but a model that
emits the key explicitly overrides it, and the empty string is neither a
specialist name nor `"deterministic"` — the only two values the contract
documents. A validator on `AgentAnswer` normalizes blank and whitespace-only to
`"orchestrator"`, and trims the rest. Normalized rather than rejected: the
answer itself was fine, and discarding it over an unfilled label would degrade
a turn the agent actually handled.

**2. An answer that declines to advise now raises `requires_attorney_review`.**
The same turn answered "No podemos determinar si debes declararte en bancarrota
o no. Por favor, habla con tu abogado" and returned `false` — exactly backwards.
`ResponseGuardrails` gains a second family of trigger: a *declination* or a
direct *referral imperative* raises the flag and changes nothing about the
message, which is already the right answer. Deliberately narrow — matching the
bare word "abogado" would fire on nearly every answer this product gives, since
routing questions to the attorney is its whole purpose.

**The wider gap:** every guardrail pattern and every replacement clause was
Spanish-only, so an English session had no eligibility guard and no
legal-advice guard *at all*. The product boundary held for `es` and was simply
absent for `en`. All three softening patterns now match both languages, and
every user-visible string — replacements and the review caveat — is chosen by
the session's language.

**3. Action labels no longer leak across languages.** Two causes, both fixed.

The model-authored half is addressed in the shared agent prompts, which now
state that action labels and card titles follow the answer's language rather
than leaving it implied by "answer in Spanish/English".

The deterministic half was structural. `BankruptcyAnalysisService` generated
all of its prose — missing items, warnings, discussion points, chapter
questions, next steps — as hardcoded Spanish, and the degraded path projects
`next_steps` onto the assistant's `ask` action labels. An English session
therefore received Spanish controls no matter what. That copy now lives in
`app/services/analysis_copy.py` as a two-language catalogue, and `analyze()`
takes the session's language: `guide()` passes the resolved session language,
and the `analyze` endpoint reads `Accept-Language` so the request contract is
unchanged.

**The trap that came with it:** `_section_for_missing` in `RuleBasedProvider`
routes a missing item to a workspace section by matching Spanish words in its
text. Translating the items without it would have sent every English session to
"overview" — a link that still renders and always goes to the wrong place. The
keyword lists now carry both languages, and a test asserts each English item
routes to the same section as its Spanish counterpart.

**4. `mypy` is clean.** The six errors were all the same shape: a runtime check
that was correct but invisible to the type checker. `decode_access_token`
validated four JWT claims through `all(...)` over a generator, which narrows
nothing, and tested the role with `in` against a set, which does not narrow
`str` to a literal — so the one function that turns an unverified token payload
into an authenticated identity had four unverified arguments at its
constructor. Roles now resolve through an allow-list mapping whose values carry
the narrowed type. `resolve_language` returns `Language` instead of `str`, and
the two `AssistantAction` constructions use `AssistantActionType` rather than
bare strings.

# User-visible behavior

An English session receives English suggested actions, warnings, missing items,
next steps and chapter questions, and English guardrail caveats. A Spanish
session is unchanged. Any answer that declines to determine something, or tells
the user to speak with their attorney, is now flagged for attorney review in
both languages.

# Migration / compatibility

No contract change. `BankruptcyAnalysisService.analyze()` gains a keyword-only
`language` defaulting to `"es"`, so existing callers keep their current output.
`ResponseGuardrails.review()` gains a keyword-only `language`, same default.

**`required_evidence` is deliberately still Spanish-only.** Those strings are
matched word-by-word against `EVIDENCE_TYPE_LABELS` to compute
`evidence_score`; translating one side without the other would silently zero
that score. It is a different defect from this one — the workspace rendering
backend-generated copy — and is recorded rather than half-fixed.

# Tests and evidence

- `test_analysis_localization.py` (9 new): the catalogue has both languages for
  every key, an English session gets English missing items and next steps,
  Spanish stays the default, the figures are identical in both languages, every
  English missing item routes to the same section as its Spanish counterpart,
  and an end-to-end `AgentRuntime.execute` on an English session returns
  English action labels.
- `test_guardrails.py` (6 new): the verbatim live-run answer now requires
  review and is left unrewritten, an English declination is caught, merely
  naming the attorney is not a declination, English eligibility and advice
  claims are softened and flagged, and the caveat follows the session language.
- `test_agent_runtime.py` (4 new): blank, whitespace-only and padded
  `handled_by`, and that the answer survives a blank label.
- Backend 165 tests, `ruff` clean, **`mypy` clean (68 files)**.
- Frontend 78 tests, lint 0 errors, build. E2E 63 tests, full serial run.

# Found while verifying

Two things the run surfaced that were not part of the brief.

`documents-add-evidence`'s focus-trap assertion required every tab stop to be
inside `[role="dialog"]`. The underlying floating-ui trap parks a 1x1
`aria-hidden` focus guard just outside the dialog to detect wrap-around, so one
tab per cycle legitimately lands there. The assertion now excludes
`aria-hidden` nodes, which is the property that actually distinguishes a guard
from a leak — the guard is 1x1, not 0x0, so a size check does not.

More importantly: an orphaned API server from another checkout was holding port
8000 and answering as version 4.1.0, and `reuseExistingServer` adopted it.
Every e2e run in this session had been exercising stale backend code, which is
why the serial suite took 10+ minutes (30s timeouts) and reported failures that
did not reproduce. With the port freed the same suite is 63 passed in 1.2
minutes. `E2E_WEB_PORT` / `E2E_API_PORT` exist for exactly this and were not
being used; a linked worktree should set them.

# Risks / limitations

The model-authored half of the language leak is mitigated by prompt wording,
not enforced. A model can still emit an off-language label; nothing server-side
rejects it, because the server cannot tell a legitimate proper noun from a
translation failure. The deterministic path — the one that runs on every
default deployment — is now guaranteed.

The declination patterns are phrase-based and will miss a refusal worded in a
way they do not cover. They are additive to the existing verdict, so a miss
leaves the previous behaviour rather than making it worse.
