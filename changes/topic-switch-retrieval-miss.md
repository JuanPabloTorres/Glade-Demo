---
taskId: topic-switch-retrieval-miss
type: test
scope: topic change, retrieval miss, and a client case with a real gap
---
# Summary

Three gaps found by auditing the running system against the release contract, not by
re-reading the plan. Two were missing tests; the third was a demo-data defect that the
automated suites could not see and a screenshot could.

# 1. The client demo case had nothing missing

`completion_score` and `missing_items` are computed from the **same eight section
booleans** in `BankruptcyAnalysisService`. Elena had all eight, so the workspace reported
**100%** and `missing_items` was empty — meaning *"¿Qué me falta?"*, the question this
product exists to answer, came back with nothing to say.

No test could have caught it: every suite asserts the completion score is *visible*, not
what it says. It was visible in a screenshot of the running app, next to a progress bar
at 100%.

Elena now records no assets, and only assets. It is the realistic section to leave open —
people record income, expenses and debts first and get to what they own last — and it is
the one section the attorney's triage does not read (`list_incomplete_cases` looks at
income, debts and evidence), so the queue keeps its three-way split while the client sees
something outstanding.

Both seeds changed together: the browser workspace is what the UI renders, the server
seed is what the portfolio counts read, and they have to tell the same story.

Verified in the running app: completion **100% → 86%**, and the dashboard now surfaces
*"Próxima acción — Completar: Bienes y activos."*

# 2. A topic change on the agentic path

A fake provider takes the tools it is scripted to take, so no test here can show that a
real model changes subject when asked. What it can show is the half that is ours: the
prompt keeps earlier turns available while presenting **only** the new question as the
thing being asked. Asserted by splitting the prompt at `Their message:` — the old
question must be on the history side and absent from the current side.

If history were appended after the message, or run together with it unlabelled, a model
answering the earlier question would be a fair reading of what we sent. That would be our
defect, not the model's.

A second test pins that a stored conversation does not survive as a constraint on the
next turn: both specialists are still offered after a turn about debts.

The deterministic path's topic switching is real logic and was already tested
(`test_ai_providers.py`: a keyword match in the current message always beats inheritance,
and inheritance requires an explicit marker). It needed nothing.

# 3. A retrieval miss

Rosa's case is seeded deliberately empty and is the "waiting on the client" case in the
attorney's queue, so asking about its documents is something the demo actually does. The
search tool must run and come back with nothing while the turn stays agentic — an empty
index that degraded the answer would make the emptiest cases the ones the assistant is
least able to discuss, which is backwards.

# Also audited, and already complete

- **§12** — a case-scoped attorney turn does not attach the portfolio. `wants_portfolio`
  requires attorney role *and* `assistant_scope == "portfolio"`; otherwise the collection
  is `[]` and the specialist is never constructed.
- **§7** — one context builder, one orchestrator factory, one runtime. No duplicate
  orchestration layers to remove.
- **§14, §17, §18, §22, §28, §29, §30** — already implemented and gated.

# Tests and evidence

Backend suites: multi-turn 7 → 9, document intelligence 3 → 4, demo seed 8 → 9.
Full backend green, ruff clean, mypy clean on 71 files. Frontend 132 passed, build clean.

# Risks / limitations

**The "Bienes" stage now opens empty in the demo.** That is the intent — it is where the
guided flow sends the user next — but it does mean the stage's empty state is now on the
demo path rather than an edge case. Covered by the responsive sweep, which walks every
stage at nine widths.
