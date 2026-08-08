---
taskId: demo-evidence-seed
type: feat
scope: reproducible synthetic evidence for the three demo cases
---
# Summary

No seeded case had a single document. `CaseDocumentModel` appeared in `seed.py` only
in the wipe list.

The client's evidence *screen* was never empty — `BankruptcyWorkspaceContext` seeds the
browser workspace with Elena's and Miguel's evidence, so the UI step always showed
something. What was empty was the **server's** record, and two things read it:

1. **The attorney's triage.** `evidence_count` was 0 for all three cases, so
   `list_incomplete_cases` returned every one of them. The tool that exists to separate
   "waiting on me" from "waiting on the client" matched everything, and the queue ranked
   on a signal no case carried.
2. **Retrieval.** Nothing was in the index, so "¿qué dice mi talón de pago?" had nothing
   to find on a freshly seeded database. Document intelligence worked only for a
   document uploaded during that same process's lifetime.

# What changed

`DemoEvidence` (filename, evidence type, text) and `_seed_evidence`, which writes to
both stores: the `case_documents` row the evidence checklist and portfolio counts read,
and the `CaseDocumentIndex` chunks the assistant searches. Writing only the first gives
a list the assistant cannot read; only the second gives answers about documents that
appear nowhere.

Distribution follows what each case has to demonstrate:

| Case | Evidence | Demonstrates |
|---|---|---|
| Elena | 2 documents **and** an open request for more | the product's actual job — what is still missing |
| Miguel | 3 documents, income, debts | ready to review |
| Rosa | none, on purpose | waiting on the client |

`CaseDocumentIndex.clear_case` is new. The database half of a reset wipes rows; without
it the vector half kept them, so repeated resets stacked duplicate chunks of the same
text and the assistant would cite documents the evidence list no longer showed.

# Tests and evidence

`tests/test_demo_seed_state.py`, eight tests asserting the *fixture* rather than the code
that reads it — the journeys are demonstrated live, and a seed that quietly flattens the
difference between three cases breaks the demo without failing anything else.

The two that would have caught this: exactly one case is urgent, and exactly one is
waiting on its client. Both are equality assertions against a single case id, not
membership — "at least one is incomplete" was true of all three.

Also asserted: the client case keeps something outstanding, the reviewable case has the
evidence a review needs, seeded text is retrievable for its own case and not another's,
and re-seeding does not stack duplicates.

Backend 343 → **351 passed**, ruff clean, mypy clean on 71 files.

# Risks / limitations

**Two seeds still describe the same cases.** The browser workspace and the server both
define Elena and Miguel, and this change adds evidence only to the server's. They now
agree on the case ids and roughly on the figures, but nothing enforces that — a change to
one can silently diverge from the other. `DEMO_CASE_ID`'s docstring already records this
as the reason the ids must match. Recorded in `docs/POST-DEMO-BACKLOG.md`.

**The index is in-memory.** Seeding it populates one process. A restart re-seeds only if
`reset_demo_data` runs again, and a multi-worker deployment would populate whichever
worker ran the seed. Unchanged by this task and already recorded.
