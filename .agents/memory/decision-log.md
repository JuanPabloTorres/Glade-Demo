# Decision Log

- Use FastAPI + SQLAlchemy 2 + Pydantic v2 for explicit DTO boundaries. **Superseded**: SQLAlchemy was never actually implemented — the shipped backend is fully stateless (no database at all). Left here for history rather than silently rewritten; see the "FreshStart" entries below for the architecture as actually shipped.
- Use a synchronous unit of work for a small demo; interfaces allow later async replacement. **Never implemented** — no repository/unit-of-work layer exists; the empty `app/repositories/`/`app/domain/` packages are placeholders for a future persistence layer, not currently wired to anything.
- Use a deterministic rules provider by default so the deployed demo works without a paid AI key.
- Keep an AI provider factory so an LLM adapter can be added without changing services.
- Use Vite + React + TypeScript + Flowbite React.
- Generate frontend endpoint metadata from the shared API contract JSON.

## FreshStart bankruptcy pivot + intelligent workspace refactor (2026-08-05, `feat/freshstart-intelligent-workspace`)

- Pivoted the product from the legal-matter-intake domain above to bankruptcy preparation (`docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`). The stateless-backend and deterministic-provider-by-default decisions above still hold; the "matter is the aggregate root" language does not (there is no matter concept anymore).
- AI providers (`backend/app/ai/providers/`) never independently decide facts/actions — `RuleBasedProvider` is the source of truth; `OllamaProvider`/`TransformersProvider` only rewrite its `message` phrasing and fall back to the untouched draft on any failure. Chosen so a model outage degrades to identical functional behavior, never a broken response.
- `CaseContextBuilder` sits between the raw case and every provider call — a reduced, per-role-redacted, audited context, not the full case object. This is the actual enforcement point for "the assistant only sees what it's supposed to."
- `ResponseGuardrails` runs on every assistant turn (softens eligibility/chapter-preference/definitive-advice phrasing), independent of which provider produced the draft.
- The chat became a persistent, app-shell-level panel (floating button + Drawer) instead of a workspace tab — case-scoped (client's own case, or whichever case an attorney has open), never contextless.
- `bankruptcy.guide`'s response contract changed incompatibly (`reply`→`message`, structured `AssistantAction[]` instead of `string[]`) → version bumped to `3.0.0`.
- Document ingestion (`backend/app/services/documents/`) and RAG (`CaseDocumentIndex`) are scaffolded with real, tested logic for the dependency-free paths (text, classification, chunking, deterministic embedding fallback); PDF/DOCX/XLSX extraction is safety-tested via mocked import failures, not real fixture files, since docling/pymupdf/python-docx/openpyxl aren't installed by default — documented as a known gap, not hidden.
