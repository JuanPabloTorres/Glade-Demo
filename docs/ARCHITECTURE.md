# Architecture

```text
React Page
  -> bankruptcyApi / authApi method (axios `http` client, JWT attached, 401 -> forced logout)
    -> generated endpoint registry (contracts/api-contracts.json -> src/api/apiContracts.generated.ts)
      -> FastAPI router (controller/action)
        -> application service (BankruptcyAnalysisService / BankruptcyGuidanceService / DocumentIngestionService)
          -> [guidance only] CaseContextBuilder -> AI provider (rule-based / Ollama / transformers) -> ResponseGuardrails
          -> [documents only] DocumentTextExtractor -> DocumentClassifier -> FinancialEvidenceExtractor -> DocumentChunker -> CaseDocumentIndex
```

No database sits in this chain — the backend is stateless per request; the full case travels with every call and the browser owns persistence (`localStorage`/`sessionStorage`). See `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` for why, and what a persistent deployment would need to add.

## Backend layers

- `api/routers`: HTTP adapters/controllers (`auth`, `bankruptcy`, `documents`, `health`).
- `schemas`: request/response DTOs, including `assistant.py` (`AssistantResponse`/`AssistantAction`/`CaseContextDto`) and `documents.py`.
- `services`: use-case orchestration (`bankruptcy_service.py`, `case_context_builder.py`, `documents/*`).
- `ai`: pluggable providers (`ai/providers/`) and `guardrails.py` — see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`.
- `repositories`, `domain`: empty placeholders reserved for a future persistence layer (not wired to anything today — see the decision log at `.agents/memory/decision-log.md`).
- `core`: configuration (`Settings`), JWT/auth, contract registry, shared domain errors.

## Frontend layers

- `api`: `bankruptcyApi`/`authApi` (axios) + the generated endpoint registry.
- `auth`: session storage, `AuthContext`, `ProtectedRoute`.
- `chat`: `ChatPanelContext` — resolves which case the persistent chat panel is scoped to.
- `workspace`: `BankruptcyWorkspaceContext` (client-side case store) + `caseMetrics` (completion/currency helpers).
- `components/atoms`: smallest reusable UI elements (e.g. `AppIcon`, sourced from `config/iconRegistry.ts`).
- `components/molecules`: composed display elements (`ResponsiveDataView`, `StageOrientation`).
- `components/organisms`: feature-level reusable sections (`AppShell`, `ModernHeader`/`ModernFooter`, `ChatPanel`, `CaseActionBar`, ...).
- `pages`: route composition (login, dashboards, case workspace, about).
