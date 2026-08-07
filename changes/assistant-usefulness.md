---
taskId: assistant-usefulness
type: minor
scope: deterministic topic detection, suggested follow-ups, summary cards
---

# Summary

Three defects a real transcript exposed. Together they made the assistant look
like it was answering at random and showing nothing worth reading — and all
three sat on the deterministic path, which is what every default deployment
actually runs.

# 1. An unrelated message inherited the previous topic

Reported: a client typed `2+2` and was answered *"No hay documentos pendientes
en este expediente por ahora"* — the reply to the question before it.

`_detect_topic` inherited the previous user turn's topic whenever the current
message was four words or fewer. That is not what a follow-up is. Reproduced
against the same history, `gracias`, `asdfgh` and `cuanto es 5*3` all inherited
`documents` too, so the assistant confidently answered a question nobody had
asked.

Inheritance now requires an explicit continuation — `¿y ahora?`, `otra vez`,
`sí`, `more`, `what about` — with the length limit kept on top, so
*"sí, pero ¿qué pasa con mi carro?"* opens a new subject rather than inheriting
one. An unrecognized message falls through to the status-derived default, which
is a weak answer but an honest one.

# 2. The chips were instructions, not questions

Reported chips: *"Solicitar los documentos faltantes antes de discutir una
estrategia."*, *"Programar una consulta para comparar alternativas
disponibles."*

An `ask` action's label is sent verbatim as the user's next message. Those
labels came from `GuidanceDraft.suggested_actions`, which holds `next_steps`,
`warnings` and `discussion_points` — imperatives aimed at the user and
statements about the case. Clicking one made the user issue an instruction to
themselves, which the assistant then had to interpret as a question. The
transcript shows exactly that happening.

`app/ai/followups.py` now supplies three follow-up questions per intent, in the
user's voice and in the session's language. The information those lists carried
is already in the answer's prose; the chips are for what to ask next.

# 3. The panel showed prose and nothing else

Reported: *"el panel no muestra información relevante"*.

`_draft_as_answer` emitted no cards, so a client reading about their debts saw
no figures beside the text — even though every figure was already in
`CaseContextDto`. The agent path could emit cards and the fallback could not,
which is backwards.

Every deterministic answer now carries a `case_summary` card: monthly cash
flow, total debt, assets, completion and evidence scores, plus pending-document
and missing-section counts when there are any. Values are read straight off the
authorized context and formatted as currency server-side, because a card's
`data` is an open map the renderer stringifies as-is — a raw `308.33` would
arrive without a currency and read as a count.

# User-visible behavior

Asking about documents and then typing something unrelated no longer repeats
the documents answer. The chips under an answer are questions a person would
plausibly ask about the topic just discussed. Every answer shows the case's
headline figures.

# Migration / compatibility

No contract change. `_draft_as_answer` takes the context rather than the
language, since the card needs the figures.

# Tests and evidence

`test_assistant_usefulness.py` (19 new) is written against the reported
transcript: junk messages inherit nothing while real follow-ups still do, a
marker attached to a new subject does not inherit, the reported turn no longer
repeats the previous answer, every chip ends in a question mark and none starts
with an imperative lifted from `next_steps`, chips differ by topic and follow
the session language, and the card reports `$18,000.00` of debt and
`$9,000.00` of assets — the figures the case actually holds, so the card cannot
disagree with the workspace behind it.

One existing assertion was updated rather than deleted: it checked that English
`next_steps` reached the labels, which is the behaviour being removed. It now
asserts the labels are English questions, preserving what it was there to prove.

Backend 219 tests, `ruff` and `mypy` clean.

# Risks / limitations

**An unrecognized message still gets a generic answer.** `2+2` now receives the
status-derived default rather than a wrong topic — better, but not an
acknowledgement that the message was not understood. Saying so explicitly would
need an out-of-scope detector narrow enough not to fire on legitimate questions
the keyword lists do not cover, which is a larger change than this one.

**The chip questions are a fixed catalogue, not generated.** They follow the
intent, not the specific figures in the answer. When the agent path is running,
the model supplies its own actions and none of this applies.
