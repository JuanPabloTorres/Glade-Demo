---
taskId: agent-answer-quality
type: minor
scope: AI runtime, prompts, tools, deterministic guidance, assistant launcher
---
# Summary

The assistant answered the sentence, not the question. The audit found one
dominant cause and it was not the prompts: **the context did not carry the
facts an evidence answer needs**, so no wording could have produced one.

`CaseContextDto` had exactly one document field, `pending_documents` — documents
an *attorney explicitly requested*. It is empty on almost every case. So "¿qué
documentos me faltan?" was answered "no hay documentos pendientes": true about
requests, useless about evidence, and identical to the answer for "¿qué
documentos tengo?" and "¿cuál consigo primero?".

Three concepts had to exist before any of those could be answered differently:
documents the case **holds**, requirements they **satisfy**, requirements
**nothing covers**.

# Audit map

| | |
|---|---|
| **GOOD** | Runtime ordering (deterministic draft first, agent second, filter, compose). Tools closed over an authorized case/portfolio — no model-supplied identifiers. Guardrails bilingual, `requires_attorney_review` OR-only. Role gating at construction. `AgentExecutionTrace` already records specialist, tools and degradation. |
| **MISSING CONTEXT** | Held documents, evidence requirements and their satisfaction — the analysis service computed them at 4.11.0 and the builder dropped them. The attorney action vocabulary: the assistant was asked what to do next and did not know what this product can do. |
| **MISSING TOOL** | Nothing could answer any document question. `get_pending_documents` returned attorney requests only. |
| **BAD TOOL DESCRIPTION** | "Get the documents that have been requested but not yet provided." Every description said *what*, none said *when* or *why*, so tool choice was a guess from the name. |
| **PROMPT PROBLEM** | `documents_agent` was told to report "cuáles faltan" with tools that could not. No reasoning contract, no direct-answer-first rule, no tool-first requirement, no bounded-proactivity rule. |
| **WEAK** | The deterministic fallback returned one sentence for four evidence intents. The portfolio agent ranked without categorizing. |
| **RESPONSE CONTRACT LIMITATION** | `AgentAnswer` is message/handled_by/actions/cards. Judged sufficient — see below. |

# User-visible behavior

**Evidence answers are now four different answers.** Measured on Elena's case
(two documents on file, eight requirements), deterministic path:

| Question | Answer |
|---|---|
| ¿Qué documentos tengo? | `2 documento(s) en el expediente: paystub-june.pdf (Talones de pago), card-statement.pdf (Estado de cuenta de acreedor). Cubren 2 de 8 requisitos.` |
| ¿Qué documentos me faltan? | `6 requisito(s) todavía no tienen documento de respaldo: Identificación vigente, Estados bancarios recientes, Planillas o transcripciones contributivas recientes.` |
| ¿Cuál consigo primero? | `Empieza por: 1. Identificación vigente; 2. Estados bancarios recientes; 3. Planillas o transcripciones contributivas recientes. Ya hay 2 de 8 requisitos cubiertos.` |
| (evidence, unspecific) | `La evidencia está 25% completa: 2 de 8 requisitos cubiertos por 2 documento(s).` |

A document already on file is never recommended as missing, because satisfied
and unsatisfied are disjoint by construction, not by wording.

**Two questions from the acceptance script were not recognized at all**, found
by running the golden scenarios rather than by reading the code:

- *"¿Y cuánto debo?"* — the most common Spanish phrasing shares no stem with
  `deuda`, so it fell to the generic missing-items default and answered "el
  próximo paso es completar gastos mensuales". It now answers `La deuda total
  registrada en este expediente es $18,000.00`.
- *"¿Qué sabes de mi caso?"* — the conversation's opening line, also unmatched.
  It now returns a summary: completeness, evidence score, status, stated goal
  and the most significant gap.

**The attorney assistant knows the toolbar.** `get_attorney_actions` exposes the
nine controls `CaseActionBar` offers, each with what it does, so "what should I
do next" can name *request the mortgage statement, which appears as pending
evidence in the client's file* instead of "follow up with the client". It is
vocabulary, not authorization: there is still no write action type, and every
one of those is a person pressing a button.

**Portfolio attention is categorized**, not just ranked: attorney action needed
/ client action needed / ready for review / no immediate action, each justified
by the recorded signal behind it.

**The floating launcher is a 48px circle**, not a labelled pill. The label
remains the accessible name and the tooltip.

**Fixed: "Could not refresh the financial analysis" on a new case.** The
attorney dashboard's "Create case" built a case owned by the *attorney*;
`CaseAccessService` refuses to create a case without a client owner, so every
such case 404'd on its first analyze call. The control is removed — attorney-
initiated intake needs an owner-selection flow and an authorization rule, which
is an ADR, not a button fix. The client path was never broken and is now pinned.

# Migration / compatibility

- `CaseContextDto` gains `held_documents`, `evidence_requirements` and
  `attorney_actions`; all default to empty, so a hand-built context still
  constructs. `attorney_actions` is empty for a client, like `attorney_notes`.
- `get_pending_documents` is replaced by `get_evidence_status`, which returns a
  superset including the attorney's requests. No HTTP contract changed;
  `contracts/api-contracts.json` is untouched.
- **`AgentAnswer` is unchanged.** The request asked whether `key_points` /
  `next_steps` / `supporting_facts` would help. They would need ChatPanel to
  render them, and `AssistantCard` already carries structured data the panel
  renders today — adding fields would be schema surface for a UI change this
  work was told not to make. Recorded as a decision, not an oversight.

# Tests and evidence

**385 backend** (was 382), including a new `tests/test_golden_scenarios.py`
(23 cases) in three layers, because "the answer was weak" has three different
causes:

1. *Grounding* — the right specialist ran the right tool, and
   `FakeProviderModel.transcript` proves the facts reached the model:
   `unsatisfied_requirements`, `satisfied_requirements` and the held document's
   filename are all in the model's view for the priority question. This is what
   separates *the model answered badly* from *the model was never told*.
2. *Deterministic answers* — our prose, asserted semantically: four questions
   produce four different answers; a covered requirement never appears as
   missing; a fully covered case says so instead of inventing a gap; English
   sessions get English requirement labels.
3. *Safety* — a client runtime raises `ToolAuthorizationError` on
   `get_attorney_actions`; the disclaimer is still server-composed; an
   eligibility question still declines with `requires_attorney_review=True`.

Multi-turn: *"¿cuál primero?" → "¿por qué esos?"* carries the first answer into
the second prompt; a topic switch to *"¿y cuánto debo?"* moves off the evidence
tools entirely. Both asserted.

`converse()` gained an optional `case` parameter — without it the golden
scenarios ran against an empty case, and "the model was told about the pay stub"
would have passed for the wrong reason.

**143 frontend**, **103 e2e**, `ruff`, `mypy`, `lint`, `build` all green. Two
e2e specs asserted the old "documentos pendientes" wording and now assert the
requirement vocabulary.

# Risks / limitations

- **Prose quality is not scored against a real model.** `FakeProviderModel`
  returns a scripted string, so scoring it would be scoring the fixture. The
  rubric in the request needs a live provider, and no credential exists in this
  environment — the same blocker the open ledger has carried since 4.0.0. What
  is proven is that the right tool runs and the right facts reach the model;
  what is not proven is how well a real model writes them up.
- `get_evidence_status` returns four lists on every document turn. Larger than
  the tool it replaced, and deliberately so — the alternative is three calls or
  a wrong answer. One call still answers every document question.
- The deterministic document branch splits on keywords. It will misread an
  unusual phrasing, as every branch in this provider can; the agent path is
  where real intent understanding lives, and this one stays auditable instead of
  imitating it.
- Removing "Create case" leaves an attorney with no way to open a case for a
  walk-in client. That is a real product gap, now visible instead of erroring.
