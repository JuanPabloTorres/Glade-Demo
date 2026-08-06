# FreshStart 3.2.0

Agent-governance and architecture release (`chore/agent-governance-v2`).

- Added native Claude Code context through root and nested `CLAUDE.md` files plus path-aware `.claude/rules`.
- Added governed lifecycle skills for baseline, task start/planning, Flowbite, feature flows, API/backend/AI/i18n changes, ADRs, verification, worktree integration, versioning and completion.
- Added specialized read-only, isolated implementation, security, testing, integration and independent release-gate agents.
- Added Claude hooks that protect `main`, reject destructive/non-selective Git commands, require task ownership, protect shared version files and block incomplete task closure.
- Added cross-platform Node tooling for repository context, task manifests, ownership, change fragments, architecture/Flowbite checks, worktrees and verification.
- Added Conventional Commit, pre-commit and full pre-push Git hooks.
- Replaced stale MatterReady/TanStack/React Hook Form/Zod/SQLAlchemy-UoW skill assumptions with pointers to the actual FreshStart architecture.
- Added Flowbite and new-flow governance, templates, schemas and agent-system documentation.
- Added CI governance and i18n gates while preserving backend, frontend and Playwright gates.
- Parallel worktrees now use change fragments; only the integration owner performs the final SemVer bump.
- `VERSION`, root/frontend package manifests and backend metadata are release authorities. Lockfile root version is informational; dependency integrity remains enforced by `npm ci`, and local version commands refresh its metadata.

# FreshStart 3.1.0

Glade interview-demo audit (`fix/glade-demo-audit-i18n-ai-health`) — full bilingual rollout plus the regressions caught while wiring it up.

- New bilingual i18next system: per-namespace locale files (es/en), a `LanguageProvider` resolving profile → persisted → browser preference, a `LanguageSelector`, `Accept-Language` propagated on every API request, and a `validate-locales` script (`npm run i18n:check`) enforcing matching keys across both languages.
- Backend error responses are now localized from `Accept-Language` via a centralized bilingual message catalog; `DomainError` subclasses carry a `code`/`message_key`.
- New `GET /api/v1/ai/health` endpoint (contract id `ai.health`) reports live AI provider/model/availability; the header and chat panel show real-time connectivity with retry.
- New reusable component tier: `AppButton`, `DataTableToolbar`, `RowActionsMenu`, `ConfirmDialog`, `useConfirmation`/`useDisclosure`, and a generic `apiClient`/`createCrudService` pair.
- Income/expense/debt/asset/evidence option values moved from literal Spanish display strings to canonical slugs so they key into the locale catalogs.
- Fixed: evidence-completeness scoring silently read 0% instead of the correct value after the slug refactor (both frontend and backend keyword-matched against the raw slug instead of its translated label); demo seed data still held pre-refactor evidence-type strings.
- Fixed: the attorney demo account defaulted to English while the client account defaulted to Spanish, silently flipping the UI language on attorney login.
- Fixed: requesting a document showed the raw internal slug (e.g. `government-id`) as its file name; changing case status wrote an untranslated status slug into the case timeline.
- Fixed: the deterministic AI provider's Spanish responses and the backend error catalog were missing accents throughout, including `anos` for `años` (a different word, not a typo).
- Rewrote `e2e/matter-workflow.spec.ts`, stale against the v3.0.0 client-dashboard rebuild, and pinned the Playwright browser locale to `es-PR` so tests don't silently run against an English-rendered app.

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
- Isolated heavyweight AI dependencies from the production API runtime.

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
