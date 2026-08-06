# FreshStart 3.0.0

Intelligent-workspace refactor (`feat/freshstart-intelligent-workspace`) — see `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` and `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md` for the full audit and plan.

**Breaking change**: `POST /api/v1/bankruptcy/guide` now returns `AssistantResponse` instead of `GuidanceResponseDto` (`reply` → `message`; `suggested_actions` is now structured `AssistantAction[]` instead of `string[]`; new `intent`/`requested_fields`/`requested_documents`/`warnings`/`summary_updates`/`requires_attorney_review`/`confidence` fields).

- Icon system replaced with a `react-icons/hi2` registry; canonical `--color-*` design tokens.
- Role-aware header/footer; new `/about` page for reviewer-facing detail.
- Client dashboard rebuilt to greeting → status → progress → next action → chat → tasks → documents → financials → timeline → attorney status.
- Client workspace reorganized into the 10-stage flow (Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento); new `ResponsiveDataView` (table on desktop, cards on mobile) and `StageOrientation` components.
- Attorney dashboard rebuilt into an operational queue: 10 filter views, search, sort, pagination.
- New attorney "case command center" action bar: solicitar documento, solicitar aclaración, añadir nota, programar consulta, asignar abogado, marcar urgente, cambiar estado, generar resumen, enviar mensaje al cliente.
- Chat is now a persistent, app-shell-level panel (floating button + drawer), not a workspace tab — reachable from the dashboard and every case.
- New pluggable AI provider architecture (`rule_based` default / `ollama` / `transformers`) — model-backed providers only ever rewrite a deterministic draft's phrasing, never invent facts or actions.
- New `CaseContextBuilder`: AI providers receive a reduced, per-role-redacted, audited context — never the raw case.
- New `ResponseGuardrails`: softens eligibility claims, chapter "best option" claims, and definitive legal-advice phrasing on every assistant turn, forcing attorney review when triggered.
- Fixed a real authorization gap: the guidance endpoint now verifies the request's declared role against the JWT, rejecting a mismatch (403) instead of trusting it.
- New document ingestion pipeline (extraction, classification, evidence extraction, chunking, embedding) and a per-case-isolated RAG index, behind a new authenticated `POST /api/v1/documents/analyze` endpoint.
- Full responsive (320–1440px) and accessibility (focus trap, aria-labels) verification pass.
- Expanded test suites: backend pytest 10 → 54; frontend went from 0 to 9 component/unit test files; Playwright expanded from one happy-path spec to the full client/attorney flows plus a mobile-viewport run.
- Removed unused dependencies (`@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`) and the orphaned `frontend/vercel.json`.
- Retired seven docs describing the pre-pivot legal-matter-intake product; consolidated the duplicate `SECURITY.md`; fixed stale naming in `AGENTS.md`, `.agents/memory/`, `docs/ARCHITECTURE.md`, and `docs/DEPLOYMENT.md`.

# FreshStart UI refresh 2.0.1

- Removed obsolete persistence foundations and legacy frontend remnants left over from the MatterReady-era codebase.
- Flowbite compatibility fixes across the rebuilt frontend.
- Added the bankruptcy product blueprint (`docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`).

# FreshStart Bankruptcy Guide 2.0.0

Major pivot: replaced the legal-matter-intake domain (MatterReady) with the FreshStart bankruptcy guidance product.

- Replaced the matter/conflict/readiness engine with the bankruptcy guidance engine.
- Built separate client and attorney bankruptcy portals.

# MatterReady AI Intake Copilot 1.0.0

- Introduced the AI Intake Copilot: a stateless, chat-first case-packet engine, replacing the prior matter workflow.
- Isolated heavyweight AI dependencies from the production API runtime (the Vercel-safe dependency split this refactor's `docs/architecture/AI-PROVIDER-ARCHITECTURE.md` continues).

# MatterReady 0.4.0

- Added a persistent, browser-based demo workspace so evaluation state survives reloads.
- Made the product purpose and guided task explicit in the UI.
- Replaced a dead-end error state with a guided recovery flow.

# MatterReady 0.3.1

- Fixed authentication dependency installation in the Vercel runtime.
- JWT security import/formatting fixes.

# MatterReady 0.3.0

- Added authenticated, human-centered workspace foundations.

# MatterReady 0.2.3

- Housekeeping release: version synchronization and CI groundwork ahead of 0.3.0.

# MatterReady 0.2.2

- Simplified delivery pipeline with reproducible CI and Vercel Git deployments.
- Removed blocked release workflows and temporary deployment logic.
- Added versioned health response and production security headers.

# MatterReady 0.2.1

- Professional Flowbite product shell and guided workflow.
- Responsive navigation and visible release version.
- Centralized Semantic Versioning across frontend and backend.
- CI enforcement for version synchronization and release increments.
- Internal routing diagnostics removed from the public product experience.
