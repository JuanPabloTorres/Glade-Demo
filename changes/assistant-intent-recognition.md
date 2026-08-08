---
taskId: assistant-intent-recognition
type: patch
scope: RuleBasedProvider intent classification
---
# Summary

Closes the three known gaps `changes/ai-eval-harness.md` recorded: the assistant
did not recognize the two questions this product exists to route to a lawyer.

`RuleBasedProvider.generate` reached its chapter branch — the only branch that
raises `requires_attorney_review` for a client — by testing the message for the
literal tokens `"capítulo 7"` / `"chapter 7"` / `"capítulo 13"` / `"chapter 13"`.
There was no keyword family for eligibility and none for the filing decision, so
every other phrasing fell through `_detect_topic`, matched no content keyword,
and landed on the generic status default. A client with a collection lawsuit
asking *"¿Debo declararme en bancarrota?"* was answered *"El próximo paso es
completar documentos de respaldo"*, unflagged.

This is the "generic context that has nothing to do with reasoning" the
assistant appeared to produce: not a model failing to reason, but an intent the
classifier had no branch for.

**Why the guardrails could not have caught it.** They inspect the *answer*, and
that answer made no prohibited claim — it was about something else entirely.
Output filtering cannot repair a question that was never recognized.

# What changed

**A new intent, checked before topic detection.** `_ELIGIBILITY_KEYWORDS`,
`_FILING_DECISION_KEYWORDS` and `_CHAPTER_UNSPECIFIED_KEYWORDS` cover both
languages. Placed ahead of `_detect_topic` because these questions frequently
carry a content keyword too: *"¿Califico para declararme en quiebra con estas
deudas?"* contains "deuda" and would otherwise be answered with a debt total.

The filing-decision keywords are multi-word spans, not bare verbs. `"debo
presentar"` alone would fire on *"¿debo presentar los documentos esta semana?"*,
which is a documents question the existing topic already answers well — verified
as a non-regression, along with *"¿Cuánta deuda tengo?"*.

**`_eligibility_question_draft` answers the question without answering it.**
It declines explicitly and names what the determination actually depends on (the
official means test, six months of income, debt classification, applicable
exemptions, and a licensed attorney). It then grounds the reply in this case's
own figures — debt, assets, monthly cash flow, completeness — read straight off
`CaseContextDto`, nothing computed or inferred. It offers the case's own chapter
questions as suggested actions, so the turn ends with something to take to the
consultation rather than a closed door. It sets
`requires_attorney_review=True` at the source rather than relying on the
guardrails' declination pattern to infer it from prose a copy edit could break.

# A defect this fix introduced, and the grader now guarding it

The English copy first read *"I cannot determine whether **you qualify**"*.
`ResponseGuardrails._ELIGIBILITY_CLAIM` matches the literal span `you qualify`,
so the guardrail substituted its softened clause into the middle of the refusal
and the user would have received:

> I cannot determine whether this may relate to the applicable requirements
> (subject to attorney review), and I cannot recommend a chapter.

The boundary held and the sentence became gibberish. Every existing grader
passed it, because nothing was checking whether the answer still read as
language. The Spanish copy was unaffected: its pattern requires `usted`/`tú`
before the verb.

The copy is now phrased `"I cannot determine your eligibility"` — outside the
pattern, which requires whitespace after `you`.

More importantly, a new **blocking** grader makes the class detectable:
`server_copy_never_trips_its_own_guardrails`. Deterministic answers are written
by us and are compliant by construction, so a guardrail rewriting one means the
*copy* is wrong, not that the guardrail saved us. It applies only to the
degraded path — a model's answer being softened is the guardrail working as
designed.

# User-visible behavior

Asking whether you qualify, whether you should file, or which chapter is best —
in either language, with or without a chapter number — now produces an explicit
refusal that explains what the determination depends on, quotes the case's own
figures, offers the relevant consultation questions, and flags the case for
attorney review. Previously six of those seven phrasings produced document
boilerplate with no flag.

`AI_PROVIDER` defaults to `rule_based` in both `config.py` and `.env.example`,
so unless the deployment overrides it this is the path production runs, and it
is exactly the path `tests/evals` gates.

# Migration / compatibility

No contract change. `GuidanceDraft` gains no fields; `intent="eligibility_question"`
is a new value of an existing free-form field. `focus_section` is
`"chapter-comparison"`, already in `ALLOWED_ACTION_RESOURCES`.

A message naming a chapter number still reaches the older, more specific chapter
branches first — their behaviour and copy are unchanged.

# Tests and evidence

- Backend **273 → 277 passed**, `ruff` clean, `mypy` clean (69 files).
- The three `known_gap` markers are deleted and their scenarios are now in the
  enforced gate. `tests/evals` reports 14/14 with no gaps and no blocking
  failures; signal score holds at the 1.0 baseline.
- Verified across all seven phrasings measured in `ai-eval-harness.md`: every
  one now returns `requires_attorney_review=True`.
- Non-regression verified on the two nearest false-positive candidates:
  *"¿Debo presentar los documentos esta semana?"* still routes to documents and
  *"¿Cuánta deuda tengo?"* still returns the debt total, both unflagged.
- Three mutation tests for the new grader, including the verbatim mangled
  sentence.
- `test_no_known_gap_has_been_silently_fixed` is no longer parametrized: with no
  gaps recorded, an empty parameter set made pytest emit a permanently-skipped
  test with a cryptic reason, which is noise that hides meaning in CI.

# Risks / limitations

**Keyword matching remains keyword matching.** A phrasing outside the lists —
"¿me sirve la quiebra?", "is bankruptcy right for me?" — still falls through to
the generic default, unflagged. The lists are auditable by reading them, which
is this provider's stated design constraint, but they are not exhaustive and
cannot be. The eval dataset is where new phrasings should land as they are
observed.

**The false-positive boundary is narrow by construction and therefore brittle in
the other direction.** `"debo presentar la petición"` is recognized;
`"debo presentar mi petición"` is not, because the span is matched literally.
Widening it risks capturing document questions. This is the trade a substring
classifier forces; a scored classifier is explicitly out of bounds for this
module.
