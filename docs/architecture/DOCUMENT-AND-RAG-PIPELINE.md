# Document Ingestion & RAG Pipeline

Living document for Block 10 of `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md`. Complements `AI-PROVIDER-ARCHITECTURE.md` and `CASE-CONTEXT-ARCHITECTURE.md`.

## Pipeline (`backend/app/services/documents/`)

`DocumentIngestionService.ingest(case_id, filename, content)` sequences six independently-testable pieces, per master instruction §7.5/§7.6:

| Class | File | Responsibility |
|---|---|---|
| `DocumentTextExtractor` | `extraction.py` | Bytes → text. `.txt`/`.md` always work; `.pdf` tries Docling then PyMuPDF; `.docx` uses python-docx; `.xlsx` uses openpyxl. |
| `DocumentClassifier` | `classification.py` | Text → an evidence-type label (matches the frontend's `EVIDENCE_TYPES` vocabulary). |
| `FinancialEvidenceExtractor` | `evidence_extraction.py` | Text → candidate dollar amounts, each tagged `provenance="extracted"`. |
| `DocumentChunker` | `chunking.py` | Text → bounded, overlapping chunks for embedding. |
| `EmbeddingService` | `embedding.py` | Chunk → vector (Ollama if configured/reachable, else a deterministic hash fallback). |
| `CaseDocumentIndex` | `index.py` | Per-case vector bucket + cosine-similarity search — the RAG isolation boundary. |

`POST /api/v1/documents/analyze` (new contract entry `documents.analyze`) wraps `DocumentIngestionService` for a base64-encoded document and returns evidence type + extracted amounts + chunk count. Auth-protected like every other endpoint.

## What's genuinely tested vs. implemented-by-inspection

Per the "no ocultar limitaciones" principle: `docling`, `pymupdf`, `python-docx`, `openpyxl`, `faiss-cpu`, and `chromadb` are **optional dependencies, not installed in the default dev/CI environment** (they live only in `backend/requirements-ai.txt` and the `documents`/`rag` pyproject extras — see `AI-PROVIDER-ARCHITECTURE.md` for why they must never reach the base `requirements.txt`).

- **Genuinely exercised against real bytes**: plain text/markdown extraction, classification, amount extraction, chunking, the deterministic embedding fallback, and case-isolation in `CaseDocumentIndex` — none of these need an optional dependency, so they run in every CI build.
- **Exercised via monkeypatched import failure, not real fixture files**: the PDF/DOCX/XLSX extraction paths. The tests (`backend/tests/test_document_pipeline.py`) prove `UnsupportedDocumentError` is raised cleanly (422, not a crash) when the optional library truly isn't installed — the same safe-degrade pattern as the AI providers (Block 8) — but they do not parse a real PDF/DOCX/XLSX file, because doing so would require installing docling (a genuinely heavy download, pulling in its own ML models) just to run the test suite.
- **Follow-up, not silently skipped**: installing the `documents` extra locally (`uv sync --extra documents`) and adding real fixture files (a tiny generated PDF/DOCX/XLSX) would let these paths be exercised end-to-end. Flagging this here rather than claiming a coverage level that doesn't exist.

## RAG scoping

Master instruction §7.6: "El RAG debe consultar únicamente: 1. Datos del caso autorizado. 2. Documentos del mismo caso. 3. Contenido educativo aprobado. 4. Plantillas internas verificadas. Nunca mezclar información entre clientes." `CaseDocumentIndex` implements the case-isolation half of this today (a plain `dict[case_id, list[chunk]]` — `search()` only ever reads the requested case's own bucket, by construction, not by a post-hoc filter that could be forgotten). `backend/tests/test_document_pipeline.py::TestCaseDocumentIndexIsolation` proves it: indexing two different cases' documents and searching one never returns the other's chunks.

**Not yet built**: a corpus of "approved educational content" or "verified internal templates" to retrieve from — that content doesn't exist in this repo yet, so there is nothing to scope retrieval against beyond case documents. `CaseDocumentIndex`'s per-case-bucket design would extend to a shared `case_id=None` (or a dedicated `"educational"` key) bucket for that content without any interface change, when that content is authored.

## Why FAISS/Chroma aren't wired in yet

For the document/case volume this demo ever handles, a plain Python `dict` + cosine similarity (no external index) is simpler and has strictly less to misconfigure than standing up FAISS or Chroma. `CaseDocumentIndex`'s public interface (`add_document`, `search`, `document_count`) is exactly what a FAISS- or Chroma-backed implementation would expose too — swapping the storage backend behind that same interface is a contained change whenever the corpus size actually warrants it, not a redesign.

## Guardrails (`backend/app/ai/guardrails.py`)

`ResponseGuardrails.review(message)` runs on **every** provider's output (rule-based or model-rewritten) inside `BankruptcyGuidanceService.guide()`, before the response reaches the client — never optional, never provider-specific. Three triggers, each independently tested (`backend/tests/test_guardrails.py`):

1. **Eligibility claims** ("usted califica...") — softened in place, not just flagged, because leaving the absolute phrasing untouched while appending a caveat elsewhere would still read as a firm claim.
2. **Chapter "best option" claims** ("Chapter 7 es la mejor opción...") — softened to "una de las alternativas a evaluar con el abogado."
3. **Definitive legal-advice imperatives** ("debe presentar...") — softened to a suggestion to discuss with the attorney.

Any trigger forces `requires_attorney_review = True` on the `AssistantResponse`, regardless of what the provider itself set. `DataProvenance` (`declared` / `extracted` / `calculated` / `inference` / `review_question`) is the shared taxonomy from §7.7 — `FinancialEvidenceExtractor` tags every amount it finds as `extracted` today; the same type is available for `CaseContextBuilder`/providers to use as this area matures.

## CI guard against dependency leakage

`backend/tests/test_production_dependencies.py::test_vercel_runtime_excludes_heavy_ai_dependencies` fails the build if any of `torch`, `transformers`, `sentence-transformers`, `accelerate`, `docling`, `faiss`, `chromadb`, `pymupdf`, `python-docx`, `openpyxl`, `pytesseract`, or `unstructured` ever appear in root `requirements.txt` — the CI guard the audit flagged as missing (the audit noted a PR could previously add a heavy dependency to `requirements.txt` with nothing catching it before it broke the Vercel function).
