# FreshStart 4.0.0

Strands Agents orchestration replaces the rewrite-only Ollama provider (`feat/strands-agent-layer`). Contract-breaking: see `docs/decisions/0002-strands-agent-orchestration.md` for the decision, the rejected options and the rollback path.

## The assistant can now look things up

Until 3.1.0 a model could only rephrase a deterministic draft — `RuleBasedProvider` decided every fact, action and section, and `OllamaProvider` swapped the prose. Safe, but the assistant could never answer anything the rule engine had not anticipated.

An orchestrator now delegates to five role-gated specialists (Agents-as-Tools), each holding only the read-only tools it needs: case status, financial figures, documents and RAG search, product help, and attorney review notes. Facts reach the model through tools, never through the prompt.

## What did not change

- **No automated legal advice.** The model cannot author the disclaimer and cannot lower `requires_attorney_review` — both are server-computed from the deterministic draft and the guardrails.
- **No cross-case access.** No tool accepts a `case_id` or `role`; tools close over the case `CaseAccessService` already authorized. Asserted against the JSON schema the model is actually handed, not just the Python signature.
- **The assistant always answers.** The deterministic draft is computed on every request. Missing extra, missing credentials, timeout, bad output or any other failure degrades to it, reported honestly as `degraded: true`.
- **Default deployment is unchanged.** `AI_PROVIDER` stays `rule_based`; the agent layer is an optional `agents` extra, excluded from the trimmed Vercel function.

## Breaking change

`AssistantResponse` becomes `language/message/handled_by/actions/cards/warnings/requires_attorney_review/degraded/disclaimer`. `intent`, `suggested_actions`, `focus_section`, `requested_fields`, `requested_documents`, `summary_updates` and `confidence` are gone. `focus_section` returns as an `open_page` action so the "open the recommended section" affordance survives — a regression a real end-to-end request caught and the unit tests had not. The frontend consumer, types and tests are updated in the same delivery; no other client exists.

Config: `OLLAMA_TIMEOUT_MS` removed (the SDK owns transport); `AI_TEMPERATURE`, `AI_MAX_OUTPUT_TOKENS` and `OPENAI_API_KEY` added. `OLLAMA_EMBEDDING_MODEL` is untouched — it belongs to RAG, not to `AI_PROVIDER`.

## Governance tooling

`scripts/agent/common.mjs` and both `.claude/hooks` resolved every path against the primary worktree and shared one `active-task.json`. A file inside a linked worktree therefore resolved to `../Glade-Demo-<task>/…`, matched no ownership glob and was always denied; and registering a task in any worktree silently replaced every other worktree's manifest. Rule `01-git-delivery` mandates worktrees for parallel work, so the governed workflow was unusable in exactly the setup the rules require. Paths now resolve per checkout, and each checkout owns its manifest under `claude-state/active/`.

## Evidence

Backend 133 tests, ruff, mypy. Frontend 47 tests (10 new), lint, i18n parity, production build. Real end-to-end HTTP against a running server: auth, ownership, persistence, serialization, 403 on role mismatch, 401 unauthenticated. Real Strands SDK integration: agents construct, tool specs generate from docstrings and type hints, `as_tool()` delegation registers, role gating holds.

## Known open items

- **No live LLM has run through this layer.** No reachable Ollama daemon and no `OPENAI_API_KEY` in the validation environment. Everything up to the SDK's tool surface is exercised; the model call is not. Confirm a real turn with `AI_PROVIDER=ollama` before treating the agent path as proven.
- `AI_PROVIDER=openai` sends reduced case context (income, debts, and for an attorney session the private notes) to a third party. Opt-in, off by default; enabling it is a data-egress decision.
- Write actions are not implemented; phase 1 is read-only. `requires_confirmation` is carried in the contract so the signed-confirmation flow is additive rather than another breaking change.
- Carried over from 3.1.0: no visual/screenshot QA, no committed production CORS origin, SQLite on Vercel's `/tmp` is not durable across cold starts.

# Fresh Start 3.2.0

UI design-system foundation, application shell, mobile navigation, branding and
section navigation (`feat/ui-responsive-branding-nav`). Frontend only — no API,
contract, auth or data-model change.

## Design system

- Flowbite v3 semantic token layer in `frontend/src/index.css`: ~20 token names
  (`bg-neutral-*`, `border-default`, `text-heading`, `text-fg-brand`,
  `rounded-base`, …) mapped onto the existing `:root` palette. `flowbite-react@0.12.9`
  does not ship these, so component blocks copied from flowbite.com previously
  rendered unstyled. It is a naming adapter, not a second palette.
- Every component now styles itself through those tokens. A sweep of
  `frontend/src/**/*.tsx` returns no raw Tailwind palette class (`indigo-600`,
  `emerald-700`, `amber-50`, `slate-*`, `gray-*`) in any JSX.
- New shared primitives: `AppAccordion` (restores the `aria-expanded` /
  `aria-controls` that `flowbite-react`'s AccordionTitle omits), `FloatingField`,
  and typography roles (`SectionTitle`, `BodyText`, `HelperText`, `ErrorText`,
  `FieldLabel`).

## Application shell and navigation

- Mobile gets a persistent bottom navigation bar plus an overflow drawer. It
  previously had a single floating menu button as the only route to any
  destination — two taps per navigation, and no indication of where you were.
- The desktop sidebar is collapsible (256px / 80px) with the preference
  persisted, carries the product mark, and no longer renders below 768px.
- `useRoleNavigation()` is the single resolver of which destinations a role
  gets, shared by the sidebar, the bottom bar and the drawer.
- `UserMenu` extracted so the product has one avatar-menu implementation. The
  build version now appears once, in the footer, instead of in both header and
  footer.

## Fixed

- **Documents / Tasks / Activities went nowhere useful.** The case page read
  `?focus=` once, copied it into component state and deleted it from the URL. A
  refresh reset to the first stage, browser Back/Forward never moved between
  stages, and no navigation entry could mark itself active because the
  destination it linked to no longer matched. The active stage is now derived
  from the URL and written back on navigation.
- **The attorney queue forced page-wide horizontal scroll at every viewport
  below 1280px.** `AppShell`'s content column is a flex item, and a flex item
  defaults to `min-width: auto`, so it refused to shrink below its content's
  intrinsic width; the queue's table pinned it at ~1280px and dragged the
  sidebar and header along. Fixed with `min-w-0` at the cause, not with
  `overflow: hidden`.
- The EN/ES control was a dropdown with exactly two items; it is now a direct
  toggle that labels itself with the language it switches to.
- Browser tab and metadata said `MatterReady`; the visible product name was
  written `FreshStart` with no space across the header, login, footer and both
  locale sets. Technical identifiers (`matter-ready-web`, the demo credentials)
  deliberately unchanged.
- `AsyncState` and `ProtectedRoute` rendered hardcoded English during a Spanish
  session; `ConfirmDialog` rendered hardcoded Spanish button labels during an
  English one, with unreachable `t()` fallbacks beneath them.
- `LanguageSelector` announced as just "ES" — its `aria-label` sat on an inner
  `<span>`, which contributes nothing to a button's accessible name.
- `DataTableToolbar` squeezed its search field to ~22px at 768px; the row
  actions trigger and several controls were below a reliable touch size.

## Added

- `/help`: a help centre with seven accordion sections (getting started,
  documents, tasks, activity, AI assistant, account, FAQ) in ES and EN. "Ayuda"
  previously pointed at `/about`, which mixes product help with privacy and
  terms; `/about` keeps the legal and reviewer-facing detail.

## Verification

Verified in a browser against the running backend, at 320 / 375 / 390 / 430 /
768 / 1024 / 1280 / 1440: no horizontal scroll for either role, no duplicate DOM
ids, no console errors, no `href="#"` placeholders, no unlabeled controls, tap
targets at or above the touch floor in the bottom bar, and nothing hidden behind
it. Language switching, accordion ARIA, bottom-nav active state, deep-link
refresh and browser Back/Forward all confirmed live. Build, lint (0 errors),
`i18n:check` (14 modules) and 37/37 unit tests pass on this branch in isolation.

Not covered: a screen-by-screen review of visual hierarchy and density, and the
form/CRUD primitive work being delivered separately.

# FreshStart 3.1.0

Glade interview-demo audit (`fix/glade-demo-audit-i18n-ai-health`) — full bilingual rollout plus the regressions caught while wiring it up. Two later change sets landed on top of this same 3.1.0 line without a version bump (see each subsection).

## Real persistence, case ownership, sidebar/design system, AI context (RAG+timeline), security hardening

Session-driven refactor addressing `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md`; full detail in `docs/audits/GLADE-DEMO-PHASE1-RESOLUTION-2026-08-06.md`.

- Real persistence layer (SQLAlchemy + Alembic); `domain/`/`repositories/` implemented for real. Server-side case-ownership authorization on every case-scoped endpoint — `owner_user_id` is always server-derived, never client-claimed.
- Sidebar-driven app shell, typography/spacing design tokens, consolidated button/icon usage, i18n cleanup, `CaseWorkspacePage` tab-navigation race condition fixed (single `activeStage` source of truth).
- RAG wired into the AI guidance flow (was ingestion-only before), case timeline + conversation history in the AI context, prompt-injection framing for retrieved documents.
- Login rate limiting, JWT production-secret boot guard, CORS production warning, demo-reset scoped to the attorney persona, functional "remember me".
- Backend tests: 55 → 89 (2 skip-gated pending a live Ollama daemon). Frontend tests: 27 → 37.
- Known open items: no visual/screenshot QA this pass; Ollama live-integration test exists but has not run against a real daemon yet; no committed production CORS origin; SQLite on Vercel's `/tmp` is not durable across cold starts.

## Agent governance & tooling (`chore/agent-governance-v2`)

- Added native Claude Code context through root and nested `CLAUDE.md` files plus path-aware `.claude/rules`.
- Added governed lifecycle skills for baseline, task start/planning, Flowbite, feature flows, API/backend/AI/i18n changes, ADRs, verification, worktree integration, versioning and completion.
- Added specialized read-only, isolated implementation, testing, integration and independent release-gate agents (kept our own `ai-context-engineer` and `security-reviewer` definitions where both change sets defined the same agent).
- Added Claude hooks that protect `main`, reject destructive/non-selective Git commands, require task ownership, protect shared version files and block incomplete task closure.
- Added cross-platform Node tooling for repository context, task manifests, ownership, change fragments, architecture/Flowbite checks, worktrees and verification.
- Added Conventional Commit, pre-commit and full pre-push Git hooks.
- Replaced stale MatterReady/TanStack/React Hook Form/Zod/SQLAlchemy-UoW skill assumptions with pointers to the actual FreshStart architecture.
- Added Flowbite and new-flow governance, templates, schemas and agent-system documentation.
- Added CI governance and i18n gates while preserving backend, frontend and Playwright gates.
- Parallel worktrees now use change fragments; only the integration owner performs the final SemVer bump.
- `VERSION` and the root/frontend application manifests are runtime release authorities. The backend API reads `VERSION`; Python package metadata remains lock-consistent and `uv lock --check` preserves dependency reproducibility.
- Frontend lockfile root version is informational; dependency integrity remains enforced by `npm ci`, and local version commands refresh its metadata.

## Bilingual i18n rollout, AI health, reusable UI primitives

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
