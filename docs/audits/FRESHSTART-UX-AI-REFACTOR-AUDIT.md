# FreshStart UX & AI Refactor — Audit

**Date:** 2026-08-05
**Base version audited:** `2.0.1` (commit `3662554`, branch `main`)
**Scope:** Read-only audit preceding the "intelligent workspace" refactor described in the master instruction. No code was changed to produce this document.

---

## 1. Repository / Git state

- Branch: `main`, clean working tree, up to date with `origin/main`.
- Last three releases: `3662554` FreshStart UI refresh v2.0.1 → `2d31181` FreshStart Bankruptcy Guide v2.0.0 (product pivot from the earlier "MatterReady" legal-intake demo) → a run of bankruptcy-guidance test/feature commits.
- No open local branches other than `main`. Several stale remote branches exist from prior feature work (`feat/ai-intake-copilot`, `feat/authenticated-human-workspace`, `feat/bankruptcy-guidance-platform`, `feat/complete-matter-workflow`, `feat/glade-visual-system`, `feat/login-background-ui-refresh`, `feat/professional-flowbite-experience`, `feat/stable-guided-demo-workspace`, `fix/vercel-auth-runtime`) plus Dependabot branches — none are merged into the work planned here; treat them as historical, not a dependency.
- Working branch for this refactor will be `feat/freshstart-intelligent-workspace`, created off current `main` tip.

## 2. Product mission, as currently documented

`README.md` and `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` are the authoritative, current product docs (see §3 for why the rest of `docs/` is not). Confirmed scope:

- Bilingual-leaning bankruptcy **preparation** platform for individuals in Puerto Rico, with a **client** flow (organize household/income/expenses/debts/assets/evidence, ask prep questions, submit to attorney) and an **attorney** flow (review, flag missing/risky items, communicate, record decisions).
- Explicit, already-documented non-goals that match the master instruction's constraints: no automated legal advice, no automatic chapter selection, no automatic eligibility/means-test determination, no court filing, no claim the app replaces official forms.
- Demo credentials are hardcoded and printed in `README.md` (`client@freshstart.demo` / `attorney@freshstart.demo`) — acceptable for a demo, must stay clearly labeled non-production.

**Conclusion:** the mission in the master instruction is a continuation, not a pivot, of what `BANKRUPTCY_PRODUCT_BLUEPRINT.md` already states. No conflicting product direction was found.

## 3. Documentation currency — significant drift found

The repo pivoted from a prior product ("MatterReady", a legal-matter-intake copilot) to FreshStart Bankruptcy Guide at v2.0.0, but only part of the documentation was updated at that time:

**Current / authoritative:** `README.md`, `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`, `docs/API-CONTRACTS.md`, `docs/DEVELOPMENT.md`, `docs/RELEASE_PIPELINE.md`, `docs/VERSIONING.md`, `contracts/api-contracts.json`.

**Stale (still describe the old MatterReady matter/conflict/readiness product):** `docs/AI_INTAKE_COPILOT.md`, `docs/AI_INTAKE_COPILOT_VALIDATION.md`, `docs/DEMO-SCRIPT.md`, `docs/DEMO_WORKFLOW.md`, `docs/EVALUATION-NOTES.md`, `docs/PROJECT-BRIEF.md`, `docs/TEST-PLAN.md`, `docs/SECURITY.md` (duplicates root `SECURITY.md` with different content), `docs/ARCHITECTURE.md` (names the API client `matterApi`), `docs/DEPLOYMENT.md` (references `matter_ready.db`), `AGENTS.md` (title still "MatterReady Demo"), `.agents/memory/project-context.md`, `.agents/memory/decision-log.md`.

**`RELEASE_NOTES.md` is 8 releases behind** `VERSION` (stops at `0.2.2`; missing `0.2.3`, `0.3.0`, `0.3.1`, `0.4.0`, `1.0.0`, `2.0.0`, `2.0.1` — i.e. it doesn't mention the bankruptcy pivot at all).

**Action for the plan:** the refactor must update `RELEASE_NOTES.md` and retire/rewrite the stale docs listed above as part of the "Limpieza" and "Release" blocks (§13–14 of the master instruction), not leave them to rot further. This is in-scope cleanup, called out explicitly so it isn't missed.

## 4. Architecture snapshot

### Frontend (`frontend/`)
- React 19 + TypeScript + Vite 7 + React Router 7 (`createBrowserRouter`) + **flowbite-react 0.12.9** + Tailwind v4 (CSS-first config, no `tailwind.config.js`).
- `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod` are installed but **unused** — forms use raw `useState`, and there's no query cache anywhere. Dead dependencies to either wire up or remove.
- 5 pages (`LoginPage`, `RoleHomePage`, `ClientDashboardPage`, `AttorneyDashboardPage`, `CaseWorkspacePage`), 11 components (5 atoms, 6 organisms), 3 files under `workspace/` (a React context + `localStorage` store, plus pure metric helpers).
- **Flowbite adoption is already strong**: 13 of 16 page/component files import directly from `flowbite-react` (Button, Card, Badge, Modal, Table, Tabs, Progress, Alert, Spinner, Navbar, Dropdown, Avatar, Footer, Timeline, form inputs). There is **no custom reimplementation of button/modal/dropdown/tabs/table/spinner/avatar/badge** — contrary to what a from-scratch product might need, this app is not starting from zero on Flowbite compliance.
- Two real gaps against the master instruction's Flowbite/icon rules:
  1. **`AppIcon.tsx`** is a hand-rolled 18-icon inline-SVG switch statement. No `react-icons`, no icon registry file (`frontend/src/config/iconRegistry.ts` does not exist).
  2. **The chat UI is fully inlined, raw markup** inside `CaseWorkspacePage.tsx`'s "Guía inteligente" tab (manual flex divs for bubbles, no avatar/timestamp/typing/retry/copy affordances, no dedicated `ChatPanel`/`ChatBubble` component, no error handling if the guidance call rejects).
- No toast/notification system, no accordion, no pagination, no drawer/sidebar nav — these Flowbite primitives are simply absent, not reimplemented badly.
- Routing has no role-namespaced URLs (`/attorney/*` vs `/client/*`); role branching happens inside components. Authorization is checked only for client-owns-case; an attorney can open any `/case/:id` in the URL bar with no assignment check (moot today since there's no case store, but will matter once persistence exists).
- Responsive: generally sound Tailwind usage; only a few arbitrary-pixel values (`max-w-[1440px]`, `max-w-[480px]`, `min-w-[260px]`) and ad hoc per-table `overflow-x-auto` wrapping (not a shared `ResponsiveDataView`).
- Tests: 2 Vitest files (logic-only, zero component tests), 1 Playwright spec covering a single happy-path flow.

### Backend (`backend/`)
- FastAPI + Pydantic v2 + pandas + rapidfuzz. **Fully stateless**: no database, no ORM; the entire case record round-trips from the browser's `localStorage` on every request. `DATABASE_URL` set in `api/index.py` is dead config — nothing reads it.
- `bankruptcy_service.py` (409 lines) does deterministic analysis (cash flow, debt/asset totals, completion score, warnings, discussion questions, next steps) via small pandas DataFrames built from request payloads — functionally fine but a heavier use of pandas than necessary; not a concern to fix, just noted as pre-existing style.
- **AI layer is minimal**: `app/ai/text_generation.py` defines one `TextGenerator` Protocol with two implementations — `TemplateTextGenerator` (no-op passthrough) and `TransformersTextGenerator` (lazy-imports `transformers`/`torch`, rewrites a fallback string, silently swallows `ImportError/RuntimeError/ValueError/OSError` and falls back with no logging). No Ollama integration exists. No intent classification, no structured response, no document/RAG pipeline. This is the real starting point for §7 of the master instruction — it is not a blank slate, but it is far short of the target provider architecture.
- **Chat/guidance endpoint** (`POST /api/v1/bankruptcy/guide`) request/response shape is narrow: `GuidanceResponseDto{reply, suggested_actions: list[str], focus_section, disclaimer}`. Missing every other field the master instruction's target `AssistantResponse` needs: `intent`, `requested_fields`, `requested_documents`, `warnings`, `summary_updates`, `requires_attorney_review`, `confidence`. `suggested_actions` today is `list[str]`, not the structured `AssistantAction` objects (id/label/icon/action_type/target) the target design calls for.
- **No document upload/ingestion pipeline** exists at all. `EvidenceItemDto` models metadata only (no file bytes/URL). Docling is a declared-but-unused optional dependency. No FAISS/Chroma, no embeddings, no OCR, no python-docx/openpyxl/PyMuPDF anywhere in the dependency tree.
- **Authorization gap (real, not hypothetical):** `role` on `GuidanceRequestDto` is self-declared by the client, never cross-checked against the JWT's `role` claim; both `/analyze` and `/guide` accept any authenticated user regardless of role or case ownership. There is no case-store to check ownership against yet, so this is currently latent, but it becomes a real vulnerability the moment persistence is added — the plan must close it in the same phase persistence is introduced, not after.
- JWT: HS256, issuer/audience/exp claims present and validated, 45 min expiry, no refresh flow. **Default JWT secret is hardcoded in `config.py`** (fine for a demo default, but must stay overridable and never silently trusted in a non-demo deployment).
- Tests: 5 pytest files — solid coverage of analysis math and basic login/401, but zero coverage of the AI provider, zero authorization-boundary tests (nothing to test against yet), zero guardrail tests.

### Deployment / CI
- Single GitHub Actions workflow (`ci.yml`): `versioning → backend (ruff/mypy/compileall/pytest) → frontend (contracts drift/eslint/vitest/build) → e2e (Playwright)`. No security/secret-scanning gate (Dependabot only, no CodeQL/gitleaks/pip-audit/npm audit).
- **Vercel** hosts the frontend + a trimmed Python serverless function (`api/index.py`, base `requirements.txt` only — no torch/transformers/sentence-transformers/docling; this isolation already works correctly and must be preserved).
- **Render** hosts an independent full Docker deployment of the same FastAPI app + managed Postgres, but still only installs base deps (not the `ai` extras) — so even the "real" hosted backend today runs `TemplateTextGenerator` in practice.
- **No CI guard** stops someone from accidentally adding a heavy dependency to root `requirements.txt` and breaking the Vercel function — worth adding as a cheap safety net during the AI-provider work.
- No Ollama service, no vector DB, no object storage anywhere in `docker-compose.yml`/`render.yaml` — these need to be added from scratch for local dev.

## 5. Flow-by-flow status against the master instruction's target questions

**Client questions already answered today:** "what's my next section" (workspace tabs), "how complete am I" (completion score card), "did I submit" (status badge). **Not answered today:** "what's missing right now in plain language" (warnings are computed but not surfaced conversationally with prioritized urgency), "what should I upload and why" (no document upload exists), "what will the attorney see" (no explicit preview), "did the attorney ask for something" (no request/notification mechanism).

**Attorney questions already answered today:** basic case list/table. **Not answered today:** urgency queue/filtering, evidence-coverage gaps, contradiction detection, structured note/timeline actions beyond a single review tab, document requests, AI-generated case summary draft.

This gap list maps directly onto master instruction §4 and should be treated as the acceptance checklist for the client/attorney dashboard and chat work in the plan.

## 6. Security posture summary

- No secrets found committed beyond intentionally-labeled demo credentials.
- JWT implementation is sound in structure (iss/aud/exp validated) but trusts a self-declared `role` field in one request body (`GuidanceRequestDto.role`) instead of deriving it from the token — a real, fixable bug, not a redesign.
- No case-level authorization exists because no case store exists — must be designed together, not sequentially, when persistence interfaces are introduced (§8 of the master instruction).
- No PII redaction, no log scrubbing exists yet for anything AI-context related, because no AI context builder exists yet.

## 7. Testing debt summary

| Layer | Exists | Gap |
|---|---|---|
| Backend pytest | Auth login/401, analysis math, contract drift | AI provider, guardrails, authz boundaries, document ingestion |
| Frontend Vitest | 2 logic-only files | Zero component tests (chat, cards, modals, responsive view, navigation, session-expiry) |
| Playwright | 1 happy-path spec | No auth-failure paths, no document flow, no attorney actions beyond opening a tab, no mobile viewport run |

## 8. Non-negotiable constraints carried forward from `AGENTS.md` / `SECURITY.md` / CI

- `contracts/api-contracts.json` remains the single source of truth for endpoint method/path/controller/action; any new `assistant`/document endpoints must be registered there and covered by `tests/test_api_contracts.py`.
- Controllers stay thin; business logic stays in services; services depend on protocols, not concrete DB/AI implementations (this is already the pattern `TextGenerator` follows — the new `BaseAIProvider` abstraction should follow the same shape).
- Every feature needs tests + doc updates; no magic strings for endpoints/status/types.
- CI gates (`versioning`, `backend`, `frontend`, `e2e`) must stay green; version must strictly increase.
- No legal advice, ever, in any AI-generated text — this is already partially enforced by the deterministic-draft-then-rewrite pattern in `bankruptcy_service.py` and must be extended, not weakened, by the new guardrail layer.

---

**This audit is read-only.** No implementation should begin until the accompanying plan (`docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md`) is reviewed.
