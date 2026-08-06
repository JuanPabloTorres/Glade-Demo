# 01 — System Map

**Branch audited:** `main` (post-merge of `fix/glade-demo-audit-i18n-ai-health`)
**Commit:** see `git log -1` at time of reading — this document was produced immediately after merging the audit branch and bumping to v3.1.0.

## What the product is

**FreshStart Bankruptcy Guide** — a bilingual bankruptcy-intake and financial-preparation platform for individuals in Puerto Rico. Two coordinated experiences:

- **Client portal**: starts a request, completes a 10-stage guided financial template (household → income → expenses → debts → assets → documents → review → submit → tracking), gets AI-assisted guidance, submits a structured case file to an attorney.
- **Attorney workspace**: receives structured requests, reviews cash flow/debt/assets, sees missing evidence and urgent flags, records notes, requests documents, changes case status, generates a draft summary.

Explicit product boundary (stated in README/AGENTS.md): the app never decides eligibility, chapter selection, or performs the official means test — it organizes information and produces discussion questions for a licensed attorney.

## Applications / projects

| Project | Path | Stack |
|---|---|---|
| Frontend web app | `frontend/` | React 19, TypeScript, Vite 7, Flowbite React, Tailwind 4, react-router 7, axios, i18next/react-i18next |
| Backend API | `backend/` | Python 3.13, FastAPI, Pydantic v2 (pydantic-settings), pandas, RapidFuzz, PyJWT, pwdlib (Argon2) |
| Contracts | `contracts/api-contracts.json` | Single source of truth for operation id / method / path / controller / action, consumed by both a frontend codegen script and a backend contract registry |

## Frontend layers (atoms → features)

```
src/
  i18n/            language context, i18next init, locale-aware formatting, backend-error translation
  locales/{es,en}/ 13 namespace JSON files per language (ai, auth, common, dashboard, errors,
                   forms, navigation, reports, settings, tables, users, validation, workspace)
  components/
    atoms/         AppIcon
    ui/            AppButton                              — new, generic
    feedback/      ConfirmDialog                          — new, generic
    data-display/  DataTableToolbar, RowActionsMenu        — new, generic
    molecules/     ResponsiveDataView, CaseStageStepper, StageOrientation, LanguageSelector
    organisms/     AppShell, ChatPanel/ChatBubble/ChatComposer, CaseActionBar,
                    BankruptcyEntryModal, ModernHeader, ModernFooter
  pages/           LoginPage, ClientDashboardPage, AttorneyDashboardPage, CaseWorkspacePage,
                   AboutPlatformPage
  hooks/           useAiHealth, useConfirmation, useDisclosure
  services/        api/apiClient.ts, crud/createCrudService.ts (generic REST helpers)
  workspace/       BankruptcyWorkspaceContext (browser-local case store), caseMetrics
  auth/            AuthContext, session storage
  api/             http.ts (axios instance), aiApi/authApi/bankruptcyApi, apiContracts.generated.ts
  config/          bankruptcyOptions.ts (canonical slugs: income/expense/debt/asset/evidence categories)
```

The atoms→features progression the master brief asks for is present and is mostly followed; `ui/`, `feedback/`, `data-display/` are new tiers added in this audit pass specifically to stop hand-rolling per-page buttons/menus/dialogs.

## Backend layers

```
app/
  main.py                 FastAPI app, CORS, global exception handlers (localized)
  core/                   config (pydantic-settings), security (JWT + Argon2 + demo accounts),
                           i18n (bilingual error catalog), errors (typed DomainError hierarchy),
                           contracts (loads contracts/api-contracts.json into a registry), version
  api/routers/             ai, auth, bankruptcy, documents, health — thin controllers, no business logic
  schemas/                 Pydantic DTOs only (assistant, auth, bankruptcy, common, documents) —
                           API boundary types, never ORM entities (there are no ORM entities)
  services/                BankruptcyAnalysisService, CaseContextBuilder, AIHealthService,
                           documents/ (extraction, classification, evidence-extraction, chunking,
                           embedding, ingestion, index — a RAG pipeline scaffold)
  ai/                      pluggable provider architecture: rule_based (default, deterministic) /
                           ollama (local model) / transformers (optional heavy deps), guardrails.py
                           softens legal-advice-sounding language
```

## Data model — how state actually persists

This is the single most important architectural fact for interpreting the rest of these audits: **there is no backend database in active use.**

- `docker-compose.yml` and `render.yaml` both provision a Postgres instance and pass `DATABASE_URL` to the API container, but no ORM, SQLAlchemy, or query code exists anywhere in `backend/app`. `DATABASE_URL` is accepted by config but never read into a connection.
- Case data (household, income, expenses, debts, assets, evidence, timeline, attorney notes) lives entirely in the **browser's localStorage**, seeded and mutated by `BankruptcyWorkspaceContext.tsx`. Two demo cases are pre-seeded (Elena Rivera / client, Miguel Santos / attorney-urgent case).
- The backend is a **stateless computation service**: given a case JSON, `/bankruptcy/analyze` returns computed financials/scores/warnings; `/bankruptcy/guide` returns an AI-drafted response; `/documents/analyze` runs the (currently rules-based) document classification pipeline. Nothing is written to durable storage server-side.
- Auth is two **hardcoded demo accounts** (`core/security.py`), not a user table.

This is a deliberate, documented tradeoff (README: "Browser-local demo workspace so Vercel deployments do not lose cases") appropriate for a demo, but it means the provisioned Postgres database in `render.yaml` is currently unused infrastructure — worth pruning or clearly labeling as "reserved for the document-ingestion RAG index" (its evident intended future use) in the deployment audit.

## Auth / authorization

- JWT (HS256), 45 min expiry, issuer/audience set, Argon2 password hashing via `pwdlib`.
- Two demo accounts only (`client@freshstart.demo`, `attorney@freshstart.demo`), both password-protected.
- Role carried in the JWT and re-verified server-side against the request's declared role (RELEASE_NOTES 3.0.0 calls out this exact fix: guidance endpoint used to trust the client-declared role).
- No user registration, no password reset flow, no refresh tokens — appropriate for a two-persona demo, would need real accounts/sessions before any non-demo use.

## Integrations / external services

- **Ollama** (optional, local/Docker only) for locally-hosted LLM-rewritten AI responses — never used on the trimmed Vercel serverless function per README.
- **Transformers** (optional dependency group) as a third AI provider option.
- No third-party SaaS integrations (no Stripe, no email provider, no external document storage) — everything is self-contained, which is appropriate for a demo but worth stating explicitly since the master brief asks about integrations.

## Deployment targets (as configured, not yet verified live — see 02-deployment-audit.md)

- **Frontend**: Vercel (`vercel.json` — Vite framework, security headers, CSP, SPA rewrite, `/api/*` proxied to a Python serverless function).
- **Backend**: Render (`render.yaml` — Docker, health check at `/api/v1/health`, provisions a Postgres DB that's currently unused — see above).
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — versioning consistency + bump check, backend (ruff/mypy/pytest), frontend (build/lint/vitest), gated on every push/PR to `main`.

## Flow-of-record

`contracts/api-contracts.json` is the single source of truth for every operation (`ai.health`, `auth.login`, `auth.me`, `bankruptcy.analyze`, `bankruptcy.guide`, `documents.analyze`). Both the frontend's generated contract client and the backend's contract registry read this same file, so a path/method/controller/action can't drift between the two without a build failure — a genuinely good architectural decision that shows up in AGENTS.md's non-negotiable rule #1.
