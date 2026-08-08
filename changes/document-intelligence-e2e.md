---
taskId: document-intelligence-e2e
type: test
scope: documents.analyze to bankruptcy.guide seam over HTTP
---
# Summary

Every link in the document chain already had tests — extraction, classification,
evidence amounts, chunking, embeddings, per-case index isolation, ingestion end to end.
None of them crossed the seam the demo actually walks: `POST /documents/analyze` writes
into the process-wide index and `POST /bankruptcy/guide` reads from it. Two indexes
instead of one would leave every lower-level test green while the assistant knew nothing
about anything the user uploaded.

# What changed

Tests only. Nothing in the pipeline needed fixing, which is the result.

`FakeProviderModel._text_of` now also flattens `toolResult` blocks, and a `transcript`
property joins everything the model was shown across a turn. That is what makes the
assertion meaningful: retrieval is asserted **at the model**, not at the index. A
document that reaches the index but never the model fails here.

# Tests and evidence

`tests/test_document_intelligence_e2e.py`, three tests:

**Happy path.** Upload a pay stub over HTTP, then ask about it. The endpoint's own
response proves the processing half (classified `Talones de pago`, `chunk_count >= 1`,
`$1,437.55` pulled out of prose — a `chunk_count` of 0 indexes nothing and still returns
200). The turn then runs `documents_agent` → `search_case_documents`, `degraded=false`,
and the document's marker appears in the model's transcript.

**Negative control.** The same upload, but a turn routed to `case_agent` where the search
tool is not offered — the marker must then be absent. Without this, the happy path would
still pass if the document reached the model some other way while the tool did nothing.

**Isolation.** The attacker is an authorized attorney, not an outsider: they may open
both cases, so no permission check stands between them. Only the per-case bucket and the
case-bound tool keep Miguel's mortgage balance out of Elena's answer. Both halves are
asserted — this case's document present, the other's absent — because absence alone
passes against a search that returned nothing at all.

Markers (`ZQ-ELENA-77`, `ZQ-MIGUEL-42`) are unmistakable on purpose. The seeded cases
carry realistic figures, so asserting on `$1,200` could pass on data that was already
there.

Backend: 343 passed, ruff clean.

# Risks / limitations

**The index is in-memory and process-wide.** It does not survive a restart, and a
multi-worker deployment would give each worker its own. `CaseDocumentIndex`'s docstring
already says a real vector store implements the same interface. For a single-process
demo this is the actual behaviour; for anything else it is a real limitation and is
recorded in `docs/POST-DEMO-BACKLOG.md`.

**Retrieval quality is not asserted, only routing and isolation.** `search` has no score
threshold — it returns the top *k* whatever the query — so these tests show the right
case's chunks reach the model, not that the most relevant chunk ranked first.
