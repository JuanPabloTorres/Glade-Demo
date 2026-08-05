# FreshStart UX & AI Refactor — Implementation Plan

**Depends on:** `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md`
**Branch:** `feat/freshstart-intelligent-workspace` (created off `main` @ `3662554`)
**Base version:** `2.0.1`

---

## 0. Versioning decision

The `bankruptcy.guide` response contract changes shape (`reply` → `message`, new required fields `intent`, `requested_fields`, `requested_documents`, `warnings`, `summary_updates`, `requires_attorney_review`, `confidence`; `suggested_actions` changes from `list[str]` to a structured `AssistantAction[]`). That is an **incompatible contract change** under the master instruction's rule ("si se cambian contratos incompatibles, usar versión major").

**Decision: bump to `3.0.0`.** If, during implementation, the team instead chooses to keep `reply` as a deprecated alias alongside `message` and keep `suggested_actions` accepting both shapes for one release, a `2.1.0` minor bump would be defensible — but that adds real code to maintain two shapes for a single-consumer app (this frontend is the only client of this API) with no proven benefit, so this plan does **not** recommend it. Proceed with `3.0.0` unless told otherwise.

## 1. Sequencing (blocks from the master instruction, §24)

Each block below is a milestone: a set of small, thematic commits that each compile, land on the feature branch, and end with the relevant test suite green locally. Blocks are sequential — no parallel implementations of the same component.

### Block 1 — Design system foundations
- Add `frontend/src/config/iconRegistry.ts`: maps every action/icon name used by the app (including the backend's `AssistantAction.icon` values) to a `react-icons/hi2` component. Add `react-icons` to `frontend/package.json`.
- Replace `AppIcon.tsx`'s inline-SVG switch with the registry lookup, preserving the existing `AppIconName` union as the public prop surface so no call sites change signature.
- Apply the palette in master instruction §10 as CSS custom properties in `frontend/src/index.css` (currently already token-driven via `.app-card`/`.primary-action` etc. — extend those tokens, don't fork a second system).
- No functional/route change in this block; Vitest + build must stay green. This is the lowest-risk block and de-risks every block after it (icons are used everywhere else).

### Block 2 — Login, header, footer
- Login: apply the background image + overlay per §11, rebuild the 55/60–40/45 desktop split and mobile-first stacked layout on top of the existing `LoginPage.tsx` (which already uses Flowbite `Card`); do not rewrite the auth logic, only layout/visuals.
- Header: extend `ModernHeader.tsx` into the role-aware nav described in §12 (client: progress/messages/documents pending/help; attorney: bandeja/urgentes/solicitudes/actividad/búsqueda) using `Navbar`, `Dropdown`, `Avatar`, `Badge`, `Tooltip` — all already Flowbite imports in this file today, so this is additive, not a rewrite.
- Footer: rebuild `ModernFooter.tsx` on Flowbite `Footer` with the content list in §13 (legal-boundary notice, privacy/security/accessibility/terms/help, version, demo-environment flag, status, copyright). Move any reviewer-facing technical detail currently in the footer to a separate `/about-platform` page.
- Acceptance: Vitest snapshot/interaction tests for header role-branching and footer content; visual check at 320/375/768/1440px.

### Block 3 — Client dashboard
- Rebuild `ClientDashboardPage.tsx` per §14.1 ordering: greeting → status → global progress → next action → chat entry point → pending tasks → requested documents → financial summary → timeline → attorney contact/review state. Reuse `caseMetrics.ts` helpers; do not duplicate completion math client- and server-side — server becomes source of truth once `CaseContextBuilder` exists (Block 8/9).
- Acceptance: Vitest for card rendering + empty/loading states; no regression to existing `caseMetrics.test.ts`.

### Block 4 — Client workspace (stages)
- Reorganize `CaseWorkspacePage.tsx` tabs into the 10-stage flow in §14.2 (Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento) using Flowbite `Sidebar`/`Timeline` for stage nav instead of the current flat `Tabs` list, while keeping `Tabs` for in-stage sub-navigation where it already works well.
- Each stage gets the orientation block from §14.3 (title, explanation, estimated time, %, missing items, primary CTA, chat access, example).
- Extract `ResponsiveDataView` (table on `lg+`, cards on mobile/tablet) per §9.5 and apply it to every existing income/expense/debt/asset table (`AttorneyDashboardPage.tsx`'s table and the per-section tables in `CaseWorkspacePage.tsx`), replacing the ad hoc per-table `overflow-x-auto` wrapping found in the audit.
- Acceptance: Playwright client flow (already partially exists in `matter-workflow.spec.ts` — extend it, don't replace) walks all 10 stages; Vitest for `ResponsiveDataView` at both breakpoints.

### Block 5 — Attorney dashboard (operational queue)
- Rebuild `AttorneyDashboardPage.tsx` per §15.1: filters (Todos/Nuevos/Incompletos/Urgentes/Enviados/En revisión/Esperando cliente/Consulta programada/Decisión pendiente/Cerrados), search by client, sorting, pagination via Flowbite `Table` + `Pagination`.
- This block depends on the case list actually reflecting server state, so it lands after Block 8 (persistence interfaces) is far enough along to expose a case-list read model — sequence check during execution; if persistence slips, ship this block against the existing `localStorage` model first and swap the data source later behind the same hook (`useCases()`), so UI work isn't blocked on backend work.
- Acceptance: Vitest for filter/sort/search logic; Playwright attorney flow extended to exercise at least one filter.

### Block 6 — Case command center
- Rebuild the attorney's case-detail view per §15.2/§15.3: executive summary, alerts, monthly flow, income/expense/debt/asset breakdown, documents, missing items, timeline, activity, notes, messages, open requests, contextual AI chat, plus the action bar (solicitar documento, solicitar aclaración, añadir nota, programar consulta, cambiar estado, marcar urgente, asignar abogado, generar resumen, enviar mensaje al cliente) — every action Flowbite `Button` + icon + Flowbite `Modal` for anything requiring input.
- The AI-generated draft summary (§15.3) is rendered with a persistent, non-dismissible "Borrador generado por IA — sujeto a revisión profesional" `Alert`.
- Acceptance: Vitest per modal; Playwright covers "solicitar documento" + "añadir nota" + "cambiar estado".

### Block 7 — Chat UI component
- Extract the current inline chat markup in `CaseWorkspacePage.tsx` into a real `ChatPanel`/`ChatBubble`/`ChatComposer` component set (per §16), built on Flowbite `Card`, `Avatar`, `Badge`, `Textarea`, `Button`, `Dropdown`, `Tooltip`, `Modal`, `Alert`, `Spinner`, `Drawer` (mobile).
- Desktop: persistent 360–440px side panel with expand option, always visible after login (per §6.1) — not just a workspace tab. Mobile: floating action / primary tab opening a `Drawer` sized to viewport with a composer that stays reachable above the mobile keyboard.
- Add loading/typing indicator, retry-on-failure, copy-to-clipboard, "expandir contexto", "abrir sección" (navigates to `focus_section`), "subir documento" (opens the upload modal from Block 10).
- Add the missing error handling identified in the audit: `sendMessage` must catch a failed `guide()` call and show a retryable error state instead of throwing unhandled.
- Acceptance: Vitest for send/retry/typing/action-button rendering; Playwright: ask "¿qué me falta?", assert a suggested action button renders and navigates on click.

### Block 8 — AI provider architecture (backend)
- Create `backend/app/ai/providers/` with `BaseAIProvider` (Protocol/ABC), `RuleBasedProvider` (wraps today's deterministic `_build_reply` logic from `bankruptcy_service.py`, moved here), `OllamaProvider` (new — calls `OLLAMA_BASE_URL`/`OLLAMA_MODEL` via HTTP, config from env, never hardcoded model id), `TransformersProvider` (refactor of today's `TransformersTextGenerator`, same lazy-import-and-swallow-safely pattern but logs the fallback instead of swallowing silently — audit flagged silent swallowing as a real gap).
- Provider selection via `AI_PROVIDER` env var (`rule_based` default, `ollama`, `transformers`); `OllamaProvider` must probe availability (short timeout) and degrade to `RuleBasedProvider` on any failure — never block the request.
- Replace the narrow `TextGenerator.compose()` call site in `BankruptcyGuidanceService` with a call into the new provider interface that returns the full structured `AssistantResponse` (see Block 9), not just a rewritten string.
- Acceptance: pytest per provider (mock Ollama unavailable → falls back; transformers import error → falls back; rule-based always succeeds); no network calls in default test run.

### Block 9 — Structured assistant response + CaseContextBuilder
- Add `AssistantResponse`/`AssistantAction` Pydantic models per master instruction §6.5, replacing `GuidanceResponseDto`. Update `contracts/api-contracts.json` for the changed `bankruptcy.guide` operation (still `POST /api/v1/bankruptcy/guide`, same operationId — payload shape changes, which is why this is the major-version trigger from §0).
- Build `CaseContextBuilder` (new `backend/app/services/case_context_builder.py`) that reduces a full `BankruptcyCaseDto` into the typed, audited context listed in §6.2 (case id, role, status, client name, objetivo, hogar, ingresos, gastos, deudas, bienes, evidencia, documentos pendientes, alertas, flujo mensual, completitud, cobertura de evidencia, timeline, notas permitidas por rol, solicitudes abiertas, próxima acción) — never pass the raw case object to a provider unfiltered.
- Regenerate `frontend/src/api/apiContracts.generated.ts` and update `bankruptcyApi.ts`/`CaseWorkspacePage.tsx`/the new `ChatPanel` to consume the new response shape.
- Fix the audit's authorization gap here, not later: derive `role` server-side from the JWT (`CurrentUserDep.role`), stop trusting `GuidanceRequestDto.role` from the client body (keep the field only as an assertion to be validated against the token, reject on mismatch).
- Acceptance: pytest for `CaseContextBuilder` (redacts/reduces correctly, never leaks a second case's data — add a same-provider-different-case test), pytest for the role-mismatch 403, `tests/test_api_contracts.py` updated and green.

### Block 10 — Guardrails + document ingestion + RAG scaffolding
- Guardrails module (`backend/app/ai/guardrails.py`): pre-return checks per §7.7 — reject/soften definitive legal-advice phrasing, never assert Chapter 7/13 as "best", never assert eligibility, mark `requires_attorney_review=True` on any of these triggers, tag output as declared/extracted/calculated/inference/question-for-review.
- Document pipeline: `DocumentIngestionService`, `DocumentTextExtractor` (Docling primary, PyMuPDF fallback for PDF, python-docx for DOCX, openpyxl for XLSX, Tesseract OCR opt-in only), `DocumentClassifier`, `FinancialEvidenceExtractor`, `DocumentChunker`, `EmbeddingService`, `CaseDocumentIndex`. Add an actual upload endpoint (new contract entry) since none exists today.
- RAG scaffolding: FAISS (default local) or Chroma behind a small interface, embeddings via `OllamaProvider`'s embedding model or `sentence-transformers`, retrieval scoped strictly to (this case's documents ∪ approved educational content ∪ verified templates) — add a same-case-isolation test mirroring Block 9's.
- Add `torch`/`transformers`/`sentence-transformers`/`docling`/`faiss`/etc. only to `backend/requirements-ai.txt` and the `ai`/`documents` pyproject extras — never to root `requirements.txt`. Add the CI guard the audit flagged as missing: a test that fails if any heavy AI dependency name appears in `requirements.txt`.
- Acceptance: pytest for extraction per format (small fixture files), guardrail unit tests (legal-advice phrasing rejected, chapter-preference phrasing rejected), isolation test, new CI dependency-boundary test green.

### Block 11 — Responsive & accessibility pass
- Systematic sweep at 320/375/390/430/768/1024/1280/1440px per §17 across every page touched in Blocks 2–7 (most already will have been built responsive-first; this is the verification + fix-up pass, not a rebuild).
- Accessibility per §18: verify labels, `aria-label`s on icon-only controls, focus-visible, keyboard nav through the new chat drawer and stage sidebar, `aria-hidden` on decorative icons, focus trap on all Flowbite modals (default behavior — verify it wasn't disabled anywhere).
- Acceptance: manual pass recorded in `docs/testing/FRESHSTART-ACCEPTANCE-TESTS.md` with screenshots at each breakpoint; axe or equivalent spot-check noted.

### Block 12 — Tests
- Backend pytest additions per master instruction §20 (auth client/attorney, role-based authz, `CaseContextBuilder`, financial calc, rule-based chat, Ollama-unavailable fallback, guardrails, case isolation, redaction, document analysis, structured actions).
- Frontend Vitest additions (icons-in-buttons, card rendering, `ResponsiveDataView`, chat, suggested actions, loading states, Flowbite modal behavior, role-based nav, error states, session expiry).
- Playwright: extend the client flow to the full 10-step sequence in §20 and add the attorney flow's 9 steps; add one full flow run at a mobile viewport.
- Acceptance: all suites green in CI, not just locally — this block isn't done until a CI run on the PR is green.

### Block 13 — Cleanup
- Resolve the documentation drift found in the audit: rewrite or retire `docs/AI_INTAKE_COPILOT.md`, `docs/AI_INTAKE_COPILOT_VALIDATION.md`, `docs/DEMO-SCRIPT.md`, `docs/DEMO_WORKFLOW.md`, `docs/EVALUATION-NOTES.md`, `docs/PROJECT-BRIEF.md`, `docs/TEST-PLAN.md`; reconcile the duplicate `docs/SECURITY.md` vs root `SECURITY.md`; fix `AGENTS.md`'s stale title and `.agents/memory/project-context.md`/`decision-log.md`; fix `docs/ARCHITECTURE.md`'s `matterApi` naming and `docs/DEPLOYMENT.md`'s `matter_ready.db` reference. Backfill `RELEASE_NOTES.md` for `0.2.3`–`2.0.1`, then add the new `3.0.0` entry.
- Remove unused dependencies discovered in the audit (`@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`) unless a block above ended up using them — if react-hook-form ends up used for the new document-upload form, keep it and drop only the ones still unused.
- Remove the orphaned `frontend/vercel.json` duplicate config flagged in the audit, after confirming root `vercel.json` fully supersedes it.

### Block 14 — Release
- Final full gate run: Ruff, mypy, Pytest, ESLint, Vitest, frontend build, Playwright — all green.
- Bump version to `3.0.0` via `npm run version:major`.
- Update `RELEASE_NOTES.md` with the full feature list, open a single PR against `main` with before/after screenshots (desktop + mobile) and a CI report link.
- Do not merge until Vercel Preview succeeds and every Definition-of-Done item in master instruction §23 is checked off explicitly in the PR description.

## 2. New documents to produce alongside code (master instruction §22)

All under `docs/`, one commit each, written as the corresponding block lands (not all at the end):
`architecture/AI-PROVIDER-ARCHITECTURE.md` (Block 8), `architecture/CASE-CONTEXT-ARCHITECTURE.md` (Block 9), `ux/CLIENT-EXPERIENCE.md` (Blocks 3–4), `ux/ATTORNEY-EXPERIENCE.md` (Blocks 5–6), `ux/FLOWBITE-COMPONENT-STANDARDS.md` (Block 1), `testing/FRESHSTART-ACCEPTANCE-TESTS.md` (Block 12).

## 3. Explicit risks carried from the audit

1. **Ownership/authorization** — closing the self-declared-role gap (Block 9) is a security fix riding along with a feature change; must not be deferred past Block 9 even under schedule pressure, since it becomes exploitable the moment persistence lands.
2. **Vercel size limits** — any accidental heavy import at module load time (e.g. importing `transformers` eagerly instead of lazily) will break the Vercel function; Block 8's lazy-import + Block 10's CI dependency-boundary test are the two guards against this.
3. **Ollama availability in CI/Vercel** — CI must never depend on a live Ollama instance; all Ollama-path tests mock the HTTP client. Vercel never runs `OllamaProvider` at all (no local model runtime there) — default `AI_PROVIDER` for that environment stays `rule_based`.
4. **Scope size** — this plan is 14 sequential blocks touching nearly every file in the app. It will span multiple sessions/PRs in practice even though the instruction asks for "a single pull request" — recommend treating that as "a single PR per block, all merging into the feature branch, with one final PR from the feature branch to `main`" rather than one enormous diff, to keep reviews tractable. Flagging this now rather than silently deviating later.

## 4. What happens next

This plan is ready for review. Per the master instruction's own gate ("No implementes hasta que estos dos documentos estén completos"), implementation does not start until you confirm:
- the `3.0.0` versioning decision in §0,
- the per-block sequencing above (especially Block 5's dependency on Block 8-in-progress),
- and which block(s) to start executing first.
