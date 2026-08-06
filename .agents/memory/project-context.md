# Project Context Memory

## Product

FreshStart Bankruptcy Guide — a bankruptcy-preparation workspace for a client and their attorney. See `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` for the full product spec and `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` for the current architecture snapshot.

## Core workflow

1. Client organizes household, income, expenses, debts, assets, and evidence metadata through a 10-stage guided workspace (`Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento`).
2. A persistent chat assistant (rule-based by default, optionally Ollama/transformers-rewritten — never a different provider deciding facts) helps the client identify what's missing and answers questions using a reduced, per-case context (`CaseContextBuilder`).
3. Client submits the case to the attorney.
4. Attorney works the case from an operational queue (filters/search/sort), opens a "case command center" with structured actions (solicitar documento, solicitar aclaración, añadir nota, programar consulta, cambiar estado, marcar urgente, asignar abogado, generar resumen, enviar mensaje al cliente).
5. Attorney records a professional decision and next steps — the app never selects a chapter or asserts eligibility itself; guardrails (`ResponseGuardrails`) actively soften any phrasing that would.

## Domain invariants

- The backend is stateless today: no database, no ORM. The full case travels with every request; the browser owns persistence (`localStorage`/`sessionStorage`). This is a deliberate, documented demo-scope choice, not an oversight.
- AI providers never see the raw case — only `CaseContextDto` (`CaseContextBuilder`), which redacts attorney notes from a client's context and summarizes household detail instead of exposing raw contact fields.
- Model-backed providers (Ollama, transformers) only ever rewrite a rule-based draft's phrasing; they cannot introduce new facts, actions, or a chapter recommendation.
- `ResponseGuardrails` runs on every assistant turn regardless of provider, softening eligibility claims, chapter "best option" claims, and definitive legal-advice phrasing.
- Heavy AI/ML dependencies (torch, transformers, docling, faiss, ...) are optional-only, never in the base `requirements.txt` — enforced by an automated CI test, not just convention.
- All demo data (clients, cases, figures) is synthetic.
