# Security policy

FreshStart is a portfolio/evaluation environment and must use invented demonstration data only — it is not a law firm and does not provide legal advice (see `README.md` and `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` for the full product boundary).

## Authentication

- The API issues signed JWT bearer tokens with issuer, audience, issued-at, and expiration claims.
- Password verification uses Argon2 through `pwdlib`.
- Protected endpoints require a valid bearer token; the chat/guidance endpoint additionally verifies the request's declared role matches the JWT's role claim, rejecting a mismatch with 403 rather than trusting a self-declared role.
- The browser stores the short-lived demo session in `sessionStorage`, clears it on expiration, and redirects to login after a 401 response.
- Production deployments must override `JWT_SECRET`, demo credentials, and the demo identity through environment variables before storing real information.

## AI / assistant boundaries

- `AI_PROVIDER` defaults to the deterministic `rule_based` provider everywhere, including the Vercel deployment. Model-backed providers (Ollama, transformers) only ever rewrite a rule-based draft's phrasing — they cannot introduce new facts, actions, or a chapter recommendation (see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`).
- `ResponseGuardrails` runs on every assistant turn and softens eligibility claims, chapter "best option" claims, and definitive legal-advice phrasing, forcing `requires_attorney_review=True` when triggered (see `docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md`).
- `CaseContextBuilder` reduces the case before any provider sees it: attorney notes are redacted from a client's context, and household detail is summarized rather than exposing raw address/contact fields (see `docs/architecture/CASE-CONTEXT-ARCHITECTURE.md`).
- Heavy AI/ML dependencies (torch, transformers, docling, faiss, etc.) are optional-only and never installed in the lightweight Vercel function — enforced by an automated test (`backend/tests/test_production_dependencies.py`), not just a convention.

## Included safeguards

- No secrets committed; configuration comes from environment variables.
- DTO validation at API boundaries; ORM entities are never serialized directly (there is no ORM/database today — see "Persistence" below).
- Explicit CORS configuration.
- Document-provider abstraction (`DocumentTextExtractor`) so extraction libraries can be swapped or isolated per format.
- No legal-advice generation, enforced structurally (see "AI / assistant boundaries" above), not only by prompt wording.

## Persistence (demo scope today)

- The backend is stateless: no database, no ORM. Case data lives in the browser (`localStorage`/`sessionStorage`) and is resent with every request. This is a deliberate demo-scope choice — see `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` and the audit at `docs/audits/FRESHSTART-UX-AI-REFACTOR-AUDIT.md` for what a persistent deployment would need to add (real case ownership checks, encrypted document storage, per-firm tenant isolation).

## Required before production use

- Identity provider integration, tenant isolation, RBAC, and least privilege.
- Encryption in transit and at rest, key rotation, and secret management.
- Secure object storage and malware scanning for uploaded documents.
- Retention/deletion policies, access logs, and data-subject workflows.
- Rate limits, idempotency, CSRF strategy where applicable, and abuse controls.
- Dependency and container scanning.
- Privacy, legal, and regulatory review for the jurisdiction(s) actually served.

## UI controls

- The public login page is the only unauthenticated product screen.
- Internal controller names, routing diagnostics, stack traces, and secrets are not shown in the interface.
- Human review is required before a document value can replace the approved client record.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not place credentials, access tokens, personal records, or exploit payloads in public issues.
